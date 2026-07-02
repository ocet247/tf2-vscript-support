/**
 * Squirrel Builtins Signatures
 * Generated from https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions
 * Only for reference, do not modify
 * @native
 */

/** @type {class} */
class integer {
    /**
     * Converts the integer to float and returns it.
     * @type {function}
     * @returns {float}
     * @nodiscard
     */
    function tofloat();

    /**
     * Converts the integer to string and returns it.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a string containing a single character represented by the integer.
     * Only works for ascii values (0-127 range), otherwise returns `"?"` if integer is outside of this range.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tochar();

    /**
     * Returns the integer itself
     * @type {function}
     * @returns {this}
     * @nodiscard
     * @hide
     */
    function tointeger();

    /**
     * Returns the integer itself
     * @type {function}
     * @returns {this}
     * @nodiscard
     * @hide
     */
    function weakref();
}

/** @type {class} */
class float {
    /**
     * Converts the float to integer and returns it. Returns `INT_MIN` for `inf`, `-inf` and `NaN`
     * @type {function}
     * @returns {integer}
     * @nodiscard
     */
    function tointeger();

    /**
     * Converts the float to string and returns it.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a string containing a single character represented by the integer part of the float.
     * Only works for ascii values (0-127 range), otherwise returns `"?"` if float is outside of this range.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tochar();

    /**
     * Returns the float itself
     * @type {function}
     * @returns {this}
     * @nodiscard
     * @hide
     */
    function tofloat();

    /**
     * Returns the float itself
     * @type {function}
     * @returns {this}
     * @nodiscard
     * @hide
     */
    function weakref();
}

/** @type {class} */
class bool {
    /**
     * Returns `1.0` for `true`, `0.0` for `false`.
     * @type {function}
     * @returns {float}
     * @nodiscard
     */
    function tofloat();

    /**
     * Returns `1` for `true`, `0` for `false`.
     * @type {function}
     * @returns {integer}
     * @nodiscard
     */
    function tointeger();

    /**
     * Returns `"true"` for `true` and `"false"` for `false`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns the bool itself
     * @type {function}
     * @returns {this}
     * @nodiscard
     * @hide
     */
    function weakref();
}

/** @type {class} */
class string {
    /**
     * Looks for the sub-string passed as its first parameter, starting at either the beginning
     * of the string or at a specific character index if one is provided as a second parameter.
     * If the sub-string is found, returns the index at which it first occurs, otherwise returns null.
     * @type {function}
     * @param {string} search_string
     * @param {integer} start_index Defaults to `0`
     * @returns {integer|null}
     * @nodiscard
     */
    function find(search_string, start_index = 0);

    /**
     * Returns the length of the string, ie. the number of characters it comprises.
     * @type {function}
     * @returns {integer}
     * @nodiscard
     */
    function len();

    /**
     * Creates a sub-string from a string. Copies characters from `start_index` to `end_index`.
     * The sub-string includes the character at start_index, but excludes the one at `end_index`.
     * If `end_index` is not specified, copies until the last character.
     * If the numbers are negative the count will start from the end of the string
     * (e.g. -2 represents a second last character).
     * @type {function}
     * @param {integer} start_index
     * @param {integer} end_index Defaults to `-1`
     * @returns {string}
     * @throws {string} if the provided start or end index is beyond the string
     * @nodiscard
     */
    function slice(start_index, end_index = -1);

    /**
     * Returns float value represented by the string. Must only contain numeric characters
     * and/or plus and minus symbols. An exception is thrown otherwise.
     * @type {function}
     * @returns {float}
     * @throws {string}
     * @nodiscard
     */
    function tofloat();

    /**
     * Returns integer value represented by the string. Must only contain numeric characters.
     * An exception is thrown otherwise. Hexadecimal notation is supported (i.e. `0xFF`).
     * If a hexadecimal string contains more than 10 characters, including the `0x`, returns `-1`.
     * @type {function}
     * @param {integer} number_base Defaults to `10`
     * @returns {integer}
     * @throws {string}
     * @nodiscard
     */
    function tointeger(number_base = 10);

    /**
     * Returns a new string with all upper-case characters converted to lower-case.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tolower();

    /**
     * Returns a new string with all lower-case characters converted to upper-case.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function toupper();

    /**
     * Returns a weak reference pointing to the string
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();

    /**
     * Returns the string itself
     * @type {function}
     * @returns {this}
     * @nodiscard
     * @hide
     */
    function tostring();
}

/** @type {class} */
class array {
    /**
     * Returns a new array of the given `length` where each element is set to `fill`.
     * @type {function}
     * @param {integer} length
     * @param {any} fill Defaults to `null`
     */
    constructor(length, fill = null);

    /**
     * Adds an item to the end of the array.
     * @type {function}
     * @param {any} item
     * @returns {this}
     */
    function append(item);

    /**
     * Applies a function to all of the array's items and replaces the original value of each
     * element with the return value of the function.
     * @type {function}
     * @param {function} func
     * ```
     * @(value: any) -> any |
     * @(value: any, index: integer) -> any |
     * @(value: any, index: integer, self: array) -> any
     * ```
     * @returns {this}
     */
    function apply(func);

    /**
     * Removes all of the items from the array.
     * @type {function}
     * @returns {this}
     */
    function clear();

    /**
     * Combines two arrays into one.
     * @type {function}
     * @param {array} other
     * @returns {this}
     */
    function extend(other);

    /**
     * Applies a filter function to the array's items, storing the results in a new array.
     * @type {function}
     * @param {function} condition `@(index: integer, value: any) -> bool`
     * @returns {array}
     */
    function filter(condition);

    /**
     * Looks for the element passed as its parameter, starting at the beginning of the array.
     * If the element is found, returns the index at which it first occurs, otherwise returns `null`.
     * @type {function}
     * @param {any} element
     * @returns {integer|null}
     * @nodiscard
     */
    function find(element);

    /**
     * Inserts an item into the array at the specified index.
     * @type {function}
     * @param {integer} index
     * @param {any} item
     * @returns {this}
     */
    function insert(index, item);

    /**
     * Returns the length of the array, ie. the number of elements it has.
     * @type {function}
     * @returns {integer}
     * @nodiscard
     */
    function len();

    /**
     * Creates a new array of the same size. For each element in the original array invokes
     * the function func and assigns the return value to the corresponding element of the new array.
     * @type {function}
     * @param {function} func
     * ```sqDoc
     * @(value: any) -> any |
     * @(value: any, index: integer) -> any |
     * @(value: any, index: integer, self: array) -> any
     * ```
     * @returns {this}
     */
    function map(func);

    /**
     * Returns and removes the value at the end of the array.
     * @type {function}
     * @returns {any}
     * @throws {string} if the array is empty.
     */
    function pop();

    /**
     * Adds an item to the end of the array.
     * @type {function}
     * @param {any} item
     * @returns {this}
     */
    function push(item);

    /**
     * Applies the supplied function to all of the items in the array, starting with the first two.
     * The function returns a single value which is then combined with the next item — and so on
     * until all items have been combined into a single value which the method returns.
     * @type {function}
     * @param {function} func `@(pre_value: any, current_value: any) -> any`
     * @param {any} init Defaults to `null`
     * @returns {this}
     */
    function reduce(func, init = null);

    /**
     * Returns and removes an array item at the specified index.
     * @type {function}
     * @param {integer} index
     * @returns {any}
     * @throws {string} if the index is outside the array's boundaries
     */
    function remove(index);

    /**
     * Increases or decreases the size of the array.
     * In case of increasing, fills the new spots with the fill parameter.
     * @type {function}
     * @param {integer} new_size
     * @param {any} fill Defaults to `null`
     * @returns {this}
     */
    function resize(new_size, fill = null);

    /**
     * Reverses the order of the elements in the array.
     * @returns {this}
     */
    function reverse();

    /**
     * Creates a new array from the array. Copies elements from `start_index` to `end_index`.
     * The new array includes the element at `start_index`, but excludes the one at `end_index`.
     * If `end_index` is not specified, copies until the last element.
     * If the numbers are negative the count will start from the end of the array
     * (e.g. `-2` represents a second last element).
     * @type {function}
     * @param {integer} start_index
     * @param {integer} end_index Defaults to `null`
     * @returns {array}
     * @throws {string} if the provided start or end index is beyond the array
     * @nodiscard
     */
    function slice(start_index, end_index = -1);

    /**
     * Sorts the items within the array into lowest-to-highest order, or according to the
     * results of an optional comparison function. If items are arrays, blobs, functions,
     * objects and/or tables, they will be sorted by reference not value.
     * The comparison function should take two parameters and return `-1` if the first value
     * should be placed before the second, `1` if it should follow, or `0` if they are equivalent.
     * @type {function}
     * @param {function} compare `@(a: any, b: any) -> integer`. Defaults to `@(a, b) a <=> b`
     * @returns {this}
     */
    function sort(compare = @(a, b) a <=> b);

    /**
     * Returns the value at the end of the array.
     * @type {function}
     * @returns {any}
     * @throws {string} if the array is empty.
     * @nodiscard
     */
    function top();

    /**
     * Returns the string `"(array : pointer)"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a weak reference pointing to the array
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();
}

/** @type {class} */
class table {
    /**
     * Removes all of the items from the table.
     * @type {function}
     * @returns {this}
     */
    function clear();

    /**
     * Creates a new table with all values that pass the test implemented by the provided function.
     * Invokes the function for each key-value pair; if it returns true, the value is added
     * to the new table at the same key.
     * @type {function}
     * @param {function} func `@(key: any, value: any) -> bool`
     * @returns {table}
     */
    function filter(func);

    /**
     * Returns the table's delegate.
     * @type {function}
     * @returns {table|null}
     * @nodiscard
     */
    function getdelegate();

    /**
     * Returns an array containing all the keys of the table slots.
     * @type {function}
     * @returns {array}
     * @nodiscard
     */
    function keys();

    /**
     * Returns the length of the table, ie. the number of entries it has.
     * @type {function}
     * @returns {integer}
     * @nodiscard
     */
    function len();

    /**
     * Deletes the target slot without employing delegation.
     * If the table lacks the target slot, returns `null`, otherwise returns the associated value.
     * @type {function}
     * @param {any} key
     * @returns {any}
     */
    function rawdelete(key);

    /**
     * Retrieves the value of the specified key without employing delegation.
     * @type {function}
     * @param {any} key
     * @returns {any}
     * @nodiscard
     */
    function rawget(key);

    /**
     * Checks for the presence of the specified key in the table without employing delegation.
     * @type {function}
     * @param {any} key
     * @returns {bool}
     * @nodiscard
     */
    function rawin(key);

    /**
     * Sets the value of the specified key without employing delegation
     * @type {function}
     * @param {any} key
     * @param {any} value
     * @returns {this}
     */
    function rawset(key, value);

    /**
     * Assigns the passed table as the target's new custom delegate.
     * To remove a delegate, pass `null`.
     * @type {function}
     * @param {table|null} delegate
     * @returns {this}
     */
    function setdelegate(delegate);

    /**
     * Returns an array containing all the values of the table slots.
     * @type {function}
     * @returns {array}
     * @nodiscard
     */
    function values();

    /**
     * Tries to invoke the `_tostring` metamethod. If that fails returns the string `"(table: pointer)"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a weak reference pointing to the table
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();
}

/** @type {class} */
class function_ {
    /**
     * Calls the target function and passes array values into its parameters.
     * First element of the array should be the non-default context object.
     * @type {function}
     * @param {array} args
     * @returns {any}
     */
    function acall(args);

    /**
     * Clones the target function and binds it to a specified context object.
     * @type {function}
     * @param {table|class|instance|null} environment
     * @returns {function}
     * @nodiscard
     */
    function bindenv(environment);

    /**
     * Calls the function with a non-default context object.
     * @type {function}
     * @param {table|class|instance|null} environment
     * @varargs {any}
     * @returns {any}
     */
    function call(environment, ...);

    /**
     * Returns a table containing information about the function,
     * such as parameters, name and source name.
     * @type {function}
     * @returns {table}
     * @nodiscard
     */
    function getinfos() {
        return {
            /** @type {bool} */
            native = null
            /** @type {string|null} */
            name = null
            /** @type {string} */
            src = null
            /** @type {[string]} */
            parameters = null
            /** @type {integer} */
            varargs = null
            /**
             * Seems to be a cummulative sum of all default parameters?
             * Breaks if you cannot add adjacent parameters together
             * This language is so weird
             * @type {array}
             */
            defparams = null
            /**
             * Only present for native functions
             * @type {integer}
             */
            paramscheck = null
            /**
             * Only present for native functions
             * @type {[integer]}
             */
            typecheck = null
        }
    }

    /**
     * Returns the root table of the closure.
     * @type {function}
     * @returns {table}
     * @nodiscard
     */
    function getroot();

    /**
     * Calls the function with an array of parameters, bypassing Squirrel error callbacks.
     * First element of the array should be the non-default context object.
     * @type {function}
     * @param {array} args
     * @returns {any}
     */
    function pacall(args);

    /**
     * Calls the function with a non-default context object, bypassing Squirrel error callbacks.
     * @type {function}
     * @param {table|class|instance|null} environment
     * @varargs {any}
     * @returns {any}
     */
    function pcall(environment, ...);

    /**
     * Sets the root table of the closure.
     * @type {function}
     * @param {table} root
     * @returns {this}
     */
    function setroot(root);

    /**
     * Returns the string `"(closure: pointer)"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();
}

/** @type {class} */
class class_ {
    /**
     * Returns the attributes of the specified member.
     * If member_name is `null`, returns the class-level attributes.
     * @type {function}
     * @param {string|null} member_name
     * @returns {any}
     * @nodiscard
     */
    function getattributes(member_name);

    /**
     * Returns a new instance of the class. Does not invoke the instance constructor.
     * The constructor must be explicitly called (e.g. `class_inst.constructor(class_inst)`).
     * @type {function}
     * @returns {instance}
     * @nodiscard
     */
    function instance();

    /**
     * Sets/adds the slot key with the value and attributes, and if present invokes
     * the `_newmember` metamethod.
     * If the slot does not exist, it will be created.
     * @type {function}
     * @param {any} key
     * @param {any} value
     * @param {table} attributes Defaults to `{}`
     * @param {bool} is_static If `true`, the slot will be added as static. Defaults to `false`
     * @returns {this}
     */
    function newmember(key, value, attributes = {}, is_static = false);

    /**
     * Deletes the target slot without employing delegation.
     * Returns `null` if the slot is missing, otherwise returns the associated value.
     * @type {function}
     * @param {any} key
     * @returns {any}
     */
    function rawdelete(key);

    /**
     * Retrieves the value of the specified key without employing delegation.
     * @type {function}
     * @param {any} key
     * @returns {any}
     * @nodiscard
     */
    function rawget(key);

    /**
     * Checks for the presence of the specified key in the class without employing delegation.
     * @type {function}
     * @param {any} key
     * @returns {bool}
     * @nodiscard
     */
    function rawin(key);

    /**
     * Sets/adds the slot key with the value and attributes, without invoking `_newmember`.
     * If the slot does not exist, it will be created.
     * @type {function}
     * @param {any} key
     * @param {any} value
     * @param {table} attributes Defaults to `{}`
     * @param {bool} is_static If `true`, the slot will be added as static. Defaults to `false`
     * @returns {this}
     */
    function rawnewmember(key, value, attributes = {}, is_static = false);

    /**
     * Sets the value of the specified key without employing delegation.
     * @type {function}
     * @param {any} key
     * @param {any} value
     * @returns {this}
     */
    function rawset(key, value);

    /**
     * Sets the attribute of the specified member and returns the previous attribute value.
     * If `member_name` is `null`, sets the class-level attributes.
     * @type {function}
     * @param {string|null} member_name
     * @param {any} value
     * @returns {any}
     */
    function setattributes(member_name, value);

    /**
     * Returns the string "(class: pointer)".
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a weak reference pointing to the class
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();
}

/** @type {class} */
class instance {
    /**
     * Returns the class that created the instance.
     * @type {function}
     * @returns {class}
     * @nodiscard
     */
    function getclass();

    /**
     * Retrieves the value of the specified key without employing delegation.
     * @type {function}
     * @param {any} key
     * @returns {any}
     * @nodiscard
     */
    function rawget(key);

    /**
     * Checks for the presence of the specified key in the instance without employing delegation.
     * @type {function}
     * @param {any} key
     * @returns {bool}
     * @nodiscard
     */
    function rawin(key);

    /**
     * Sets the value of the specified key without employing delegation.
     * @type {function}
     * @param {any} key
     * @param {any} value
     * @returns {this}
     */
    function rawset(key, value);

    /**
     * Tries to invoke the `_tostring` metamethod. If that fails returns the string `"(instance: pointer)"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a weak reference pointing to the instance
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();
}

/** @type {class} */
class generator {
    /**
     * Returns the status of the generator as a string: `"running"`, `"dead"` or `"suspended"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function getstatus();

    /**
     * Returns the string `"(generator : pointer)"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a weak reference pointing to the generator
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();
}

/** @type {class} */
class thread {
    /**
     * Starts the thread with the specified parameters. Returns either the first suspend value
     * or the returned value of the function if no suspends were triggered.
     * @type {function}
     * @varargs {any}
     * @returns {any}
     */
    function call(...);

    /**
     * Returns the stack frame information at the given stack level.
     * (`0` is the current function, `1` is the caller, and so on.)
     * Returns null if the stack level doesn't exist.
     * @type {function}
     * @param {integer} level
     * @returns {table|null}
     * @nodiscard
     */
    function getstackinfos(level) {
        return {
            /** @type {string} */
            func = null
            /** @type {string} */
            src = null
            /** @type {integer} */
            line = null
            /** @type {table} */
            locals = null
        }
    }

    /**
     * Returns the status of the thread as a string: `"idle"`, `"running"` or `"suspended"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function getstatus();

    /**
     * Returns the string `"(thread : pointer)"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a weak reference pointing to the thread
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();

    /**
     * Wakes up a suspended thread. The optional `return_value` will be used as the return value
     * for the `suspend()` call that paused the thread.
     * @type {function}
     * @param {any} return_value Defaults to `null`
     * @returns {any} the next suspended value or the thread's return value.
     */
    function wakeup(return_value = null);

    /**
     * Wakes up a suspended thread, throwing `obj_to_throw` as an exception inside it.
     * @type {function}
     * @param {any} obj_to_throw
     * @param {bool} propagate_error Defaults to `true`
     * @returns {any}
     */
    function wakeupthrow(obj_to_throw, propagate_error = true);
}

/** @type {class} */
class weakref {
    /**
     * Returns the object that the weak reference is pointing at.
     * @type {function}
     * @returns {any} `null` if the referenced object has been destroyed.
     * @nodiscard
     */
    function ref();

    /**
     * Returns the string `"(weakref : pointer)"`.
     * @type {function}
     * @returns {string}
     * @nodiscard
     */
    function tostring();

    /**
     * Returns a weak reference pointing to the weakref
     * @type {function}
     * @returns {weakref}
     * @nodiscard
     */
    function weakref();
}

/** @type {class} */
class null_ {}