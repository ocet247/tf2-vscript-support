/*
Portions of this file are derived from auto-lsp
Copyright (C) 2025 CLAUZEL Adrien
Licensed under GPL-3.0: https://www.gnu.org/licenses/gpl-3.0.html
*/
#![allow(clippy::unwrap_used)]

use anyhow::Error;
use crossbeam_channel::select;
use lsp_server::{
    Connection, ErrorCode, Message, Notification, Request, RequestId, Response, ResponseError,
};
use rustc_hash::FxHashMap;
use std::{num::NonZeroUsize, panic::RefUnwindSafe, sync::Arc};

use crate::vendored::{intent::ThreadIntent, pool::Pool};

macro_rules! impl_handlers {
    ($struct_name:ident, $method_trait:path, $result:ty, $serialize:expr) => {
        pub struct $struct_name<Db: salsa::Database + Clone + Send + RefUnwindSafe> {
            normal: FxHashMap<String, CallbackWithIntent<Db>>,
            sync_mut: FxHashMap<String, SyncMutCallback<Db>>,
        }

        impl<Db: salsa::Database + Clone + Send + RefUnwindSafe> Default for $struct_name<Db> {
            fn default() -> Self {
                Self {
                    normal: FxHashMap::default(),
                    sync_mut: FxHashMap::default(),
                }
            }
        }

        impl<Db: salsa::Database + Clone + Send + RefUnwindSafe> $struct_name<Db> {
            fn on_with_intent<R, const ALLOW_RETRYING: bool>(
                &mut self,
                intent: ThreadIntent,
                handler: fn(&Db, R::Params) -> anyhow::Result<$result>,
            ) -> &mut Self
            where
                R: $method_trait,
            {
                let callback: Callback<Db> = Arc::new(move |db, params| {
                    let parsed: R::Params = serde_json::from_value(params)?;
                    let result = handler(db, parsed)?;
                    Ok($serialize(result))
                });
                self.normal
                    .insert(R::METHOD.to_string(), (callback, intent, ALLOW_RETRYING));
                self
            }

            pub fn on<R, const ALLOW_RETRYING: bool>(
                &mut self,
                handler: fn(&Db, R::Params) -> anyhow::Result<$result>,
            ) -> &mut Self
            where
                R: $method_trait,
            {
                self.on_with_intent::<R, ALLOW_RETRYING>(ThreadIntent::Worker, handler)
            }

            pub fn on_latency_sensitive<R, const ALLOW_RETRYING: bool>(
                &mut self,
                handler: fn(&Db, R::Params) -> anyhow::Result<$result>,
            ) -> &mut Self
            where
                R: $method_trait,
            {
                self.on_with_intent::<R, ALLOW_RETRYING>(ThreadIntent::LatencySensitive, handler)
            }

            pub fn on_mut<R>(
                &mut self,
                handler: fn(&mut Session<Db>, R::Params) -> anyhow::Result<$result>,
            ) -> &mut Self
            where
                R: $method_trait,
            {
                let callback: SyncMutCallback<Db> = Box::new(move |session, params| {
                    let parsed: R::Params = serde_json::from_value(params)?;
                    let result = handler(session, parsed)?;
                    Ok($serialize(result))
                });
                self.sync_mut.insert(R::METHOD.to_string(), callback);
                self
            }
        }
    };
}

impl_handlers!(
    RequestHandlers,
    lsp_types::request::Request,
    R::Result,
    |r| { serde_json::to_value(r).unwrap() }
);

impl_handlers!(
    NotificationHandlers,
    lsp_types::notification::Notification,
    (),
    |()| serde_json::Value::Null
);

type Callback<Db> = Arc<
    dyn Fn(&Db, serde_json::Value) -> anyhow::Result<serde_json::Value>
        + Send
        + Sync
        + RefUnwindSafe
        + 'static,
>;
type CallbackWithIntent<Db> = (Callback<Db>, ThreadIntent, bool);
type SyncMutCallback<Db> =
    Box<dyn Fn(&mut Session<Db>, serde_json::Value) -> anyhow::Result<serde_json::Value>>;

type ReqHandler<Db> = fn(&mut Session<Db>, lsp_server::Response);
type ReqQueue<Db> = lsp_server::ReqQueue<String, ReqHandler<Db>>;

#[derive(Debug)]
enum Task {
    Response(Response),
    // Diagnostics(DiagnosticKind, Url, Vec<Diagnostic>),
    Retry(Request),
    NotificationError(Error),
}

pub struct Session<Db: salsa::Database + Clone + Send + RefUnwindSafe> {
    task_receiver: crossbeam_channel::Receiver<Task>,
    task_sender: crossbeam_channel::Sender<Task>,
    task_pool: Pool,
    pub req_queue: ReqQueue<Db>,
    pub connection: Connection,
    pub db: Db,
}

impl<Db: salsa::Database + Clone + Send + RefUnwindSafe> Session<Db> {
    pub fn new(connection: Connection, db: Db) -> Self {
        let (task_sender, task_receiver) = crossbeam_channel::unbounded();

        let max_threads = std::thread::available_parallelism()
            .unwrap_or_else(|_| NonZeroUsize::new(1).unwrap())
            .get();

        log::info!("Max threads: {max_threads}");

        Self {
            task_receiver,
            task_sender,
            task_pool: Pool::new(max_threads),
            req_queue: ReqQueue::default(),
            connection,
            db,
        }
    }

    pub fn main_loop(
        mut self,
        req_handlers: &RequestHandlers<Db>,
        not_handlers: &NotificationHandlers<Db>,
    ) -> anyhow::Result<()> {
        loop {
            select! {
                recv(self.connection.receiver) -> msg => {
                    match msg? {
                        Message::Request(req) => {
                            if self.connection.handle_shutdown(&req)? {
                                return Ok(());
                            }

                            self.req_queue.incoming.register(req.id.clone(), req.method.clone());
                            self.handle_request(req, req_handlers)?;
                        }
                        Message::Notification(not) => {
                            self.handle_notification(not, not_handlers)?;
                        }
                        Message::Response(_) => {}
                    }
                },
                recv(self.task_receiver) -> task => {
                    match task? {
                        Task::Response(resp) => self.req_complete(resp)?,
                        Task::Retry(req) => {
                            if self.req_queue.incoming.is_completed(&req.id) {
                                continue;
                            }

                            self.handle_request(req, req_handlers)?;
                        }
                        Task::NotificationError(err) => self.not_error(&err)?,
                    }
                }
            }
        }
    }

    fn handle_request(
        &mut self,
        req: Request,
        req_handlers: &RequestHandlers<Db>,
    ) -> anyhow::Result<()> {
        if let Some(method) = req_handlers.normal.get(&req.method) {
            self.req_exec(method, req);
        } else if let Some(method) = req_handlers.sync_mut.get(&req.method) {
            self.req_exec_sync_mut(method, req)?;
        } else {
            self.req_complete(Response {
                id: req.id,
                result: None,
                error: Some(lsp_server::ResponseError {
                    code: ErrorCode::MethodNotFound as i32,
                    message: format!("Method mismatch for request '{}'", req.method),
                    data: None,
                }),
            })?;
        }
        Ok(())
    }

    fn req_exec(&self, callback: &CallbackWithIntent<Db>, req: Request) {
        let params = req.params.clone();
        let id = req.id.clone();

        let db = self.db.clone();
        let cb = Arc::clone(&callback.0);
        let intent = callback.1;
        let sender = self.task_sender.clone();
        let allow_retrying = callback.2;
        self.task_pool.spawn(
            intent,
            std::panic::AssertUnwindSafe(move || {
                let cb = cb.clone();
                match salsa::Cancelled::catch(|| cb(&db, params)) {
                    Err(e) if allow_retrying => {
                        log::warn!("Cancelled request '{}': {}", req.method, e);
                        sender.send(Task::Retry(req)).unwrap();
                    }
                    Err(e) => {
                        log::warn!("Cancelled request '{}': {}", req.method, e);
                        sender
                            .send(Task::Response(Response {
                                id,
                                result: None,
                                error: Some(lsp_server::ResponseError {
                                    code: ErrorCode::ContentModified as i32,
                                    message: "content modified".into(),
                                    data: None,
                                }),
                            }))
                            .unwrap();
                    }
                    Ok(result) => match result {
                        Ok(result) => sender
                            .send(Task::Response(Response {
                                id,
                                result: Some(result),
                                error: None,
                            }))
                            .unwrap(),
                        Err(e) => {
                            sender.send(Task::Response(response_error(id, &e))).unwrap();
                        }
                    },
                }
            }),
        );
    }

    fn req_exec_sync_mut(
        &mut self,
        callback: &SyncMutCallback<Db>,
        req: Request,
    ) -> anyhow::Result<()> {
        if let Err(e) = callback(self, req.params) {
            self.req_complete(response_error(req.id, &e))
        } else {
            Ok(())
        }
    }

    fn req_complete(&mut self, response: lsp_server::Response) -> anyhow::Result<()> {
        let id = response.id.clone();
        if !self.req_queue.incoming.is_completed(&id) {
            self.req_queue.incoming.complete(&id);
        }
        Ok(self.connection.sender.send(Message::Response(response))?)
    }

    fn handle_notification(
        &mut self,
        not: Notification,
        not_handlers: &NotificationHandlers<Db>,
    ) -> anyhow::Result<()> {
        if let Some(method) = not_handlers.normal.get(&not.method).cloned() {
            self.not_exec(&method, not);
        } else if let Some(method) = not_handlers.sync_mut.get(&not.method) {
            self.not_exec_sync_mut(method, not)?;
        } else {
            self.not_error(&anyhow::format_err!("Unknown notification: {}", not.method))?;
        }
        Ok(())
    }

    fn not_exec(&self, callback: &CallbackWithIntent<Db>, not: Notification) {
        let params = not.params;

        let db = self.db.clone();
        let cb = Arc::clone(&callback.0);
        let intent = callback.1;
        let sender = self.task_sender.clone();
        self.task_pool.spawn(
            intent,
            std::panic::AssertUnwindSafe(move || {
                match salsa::Cancelled::catch(|| cb(&db, params)) {
                    Err(e) => {
                        log::warn!("Cancelled notification '{}': {}", not.method, e);
                    }
                    Ok(result) => {
                        if let Err(e) = result {
                            sender.send(Task::NotificationError(e)).unwrap();
                        }
                    }
                }
            }),
        );
    }

    fn not_exec_sync_mut(
        &mut self,
        callback: &SyncMutCallback<Db>,
        not: Notification,
    ) -> anyhow::Result<()> {
        if let Err(e) = callback(self, not.params) {
            self.not_error(&e)
        } else {
            Ok(())
        }
    }

    fn not_error(&self, error: &anyhow::Error) -> anyhow::Result<()> {
        self.connection
            .sender
            .send(Message::Notification(Notification {
                method: "window/showMessage".to_string(),
                params: serde_json::json!({
                    "type": lsp_types::MessageType::ERROR,
                    "message": error.to_string(),
                }),
            }))?;
        Ok(())
    }

    pub fn refresh_request<T: lsp_types::request::Request>(&self) {
        let request = Request::new(0.into(), T::METHOD.into(), ());
        let _ = self.connection.sender.send(request.into());
    }
}

fn response_error(id: RequestId, error: &anyhow::Error) -> Response {
    Response {
        id,
        result: None,
        error: Some(ResponseError {
            code: ErrorCode::RequestFailed as i32,
            message: error.to_string(),
            data: None,
        }),
    }
}

fn content_modified_error(id: RequestId) -> Response {
    Response {
        id,
        result: None,
        error: Some(ResponseError {
            code: lsp_server::ErrorCode::ContentModified as i32,
            message: "content modified".to_owned(),
            data: None,
        }),
    }
}
