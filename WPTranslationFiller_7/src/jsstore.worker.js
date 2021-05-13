/*!
 * @license :jsstore - V3.13.6 - 20/04/2021
 * https://github.com/ujjwalguptaofficial/JsStore
 * Copyright (c) 2021 @Ujjwal Gupta; Licensed MIT
 */
var JsStoreWorker =
/******/
function (modules) {
  // webpackBootstrap

  /******/
  // The module cache

  /******/
  var installedModules = {};
  /******/

  /******/
  // The require function

  /******/

  function __webpack_require__(moduleId) {
    /******/

    /******/
    // Check if module is in cache

    /******/
    if (installedModules[moduleId]) {
      /******/
      return installedModules[moduleId].exports;
      /******/
    }
    /******/
    // Create a new module (and put it into the cache)

    /******/


    var module = installedModules[moduleId] = {
      /******/
      i: moduleId,

      /******/
      l: false,

      /******/
      exports: {}
      /******/

    };
    /******/

    /******/
    // Execute the module function

    /******/

    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/

    /******/
    // Flag the module as loaded

    /******/

    module.l = true;
    /******/

    /******/
    // Return the exports of the module

    /******/

    return module.exports;
    /******/
  }
  /******/

  /******/

  /******/
  // expose the modules object (__webpack_modules__)

  /******/


  __webpack_require__.m = modules;
  /******/

  /******/
  // expose the module cache

  /******/

  __webpack_require__.c = installedModules;
  /******/

  /******/
  // define getter function for harmony exports

  /******/

  __webpack_require__.d = function (exports, name, getter) {
    /******/
    if (!__webpack_require__.o(exports, name)) {
      /******/
      Object.defineProperty(exports, name, {
        enumerable: true,
        get: getter
      });
      /******/
    }
    /******/

  };
  /******/

  /******/
  // define __esModule on exports

  /******/


  __webpack_require__.r = function (exports) {
    /******/
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      /******/
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: 'Module'
      });
      /******/
    }
    /******/


    Object.defineProperty(exports, '__esModule', {
      value: true
    });
    /******/
  };
  /******/

  /******/
  // create a fake namespace object

  /******/
  // mode & 1: value is a module id, require it

  /******/
  // mode & 2: merge all properties of value into the ns

  /******/
  // mode & 4: return value when already ns object

  /******/
  // mode & 8|1: behave like require

  /******/


  __webpack_require__.t = function (value, mode) {
    /******/
    if (mode & 1) value = __webpack_require__(value);
    /******/

    if (mode & 8) return value;
    /******/

    if (mode & 4 && typeof value === 'object' && value && value.__esModule) return value;
    /******/

    var ns = Object.create(null);
    /******/

    __webpack_require__.r(ns);
    /******/


    Object.defineProperty(ns, 'default', {
      enumerable: true,
      value: value
    });
    /******/

    if (mode & 2 && typeof value != 'string') for (var key in value) __webpack_require__.d(ns, key, function (key) {
      return value[key];
    }.bind(null, key));
    /******/

    return ns;
    /******/
  };
  /******/

  /******/
  // getDefaultExport function for compatibility with non-harmony modules

  /******/


  __webpack_require__.n = function (module) {
    /******/
    var getter = module && module.__esModule ?
    /******/
    function () {
      return module['default'];
    } :
    /******/
    function () {
      return module;
    };
    /******/

    __webpack_require__.d(getter, 'a', getter);
    /******/


    return getter;
    /******/
  };
  /******/

  /******/
  // Object.prototype.hasOwnProperty.call

  /******/


  __webpack_require__.o = function (object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
  };
  /******/

  /******/
  // __webpack_public_path__

  /******/


  __webpack_require__.p = "";
  /******/

  /******/

  /******/
  // Load entry module and return exports

  /******/

  return __webpack_require__(__webpack_require__.s = 10);
  /******/
}(
/************************************************************************/

/******/
{
  /***/
  10:
  /***/
  function (module, __webpack_exports__, __webpack_require__) {
    "use strict"; // ESM COMPAT FLAG

    __webpack_require__.r(__webpack_exports__); // EXPORTS


    __webpack_require__.d(__webpack_exports__, "QueryExecutor", function () {
      return (
        /* reexport */
        worker_query_executor_QueryExecutor
      );
    });

    __webpack_require__.d(__webpack_exports__, "initialize", function () {
      return (
        /* reexport */
        initialize
      );
    });

    __webpack_require__.d(__webpack_exports__, "Config", function () {
      return (
        /* reexport */
        Config
      );
    });

    __webpack_require__.d(__webpack_exports__, "KeyStore", function () {
      return (
        /* reexport */
        instance_KeyStore
      );
    }); // CONCATENATED MODULE: ./src/common/enums.ts


    var ERROR_TYPE;

    (function (ERROR_TYPE) {
      ERROR_TYPE["WorkerNotSupplied"] = "worker_not_supplied";
      ERROR_TYPE["IndexedDbUndefined"] = "indexeddb_undefined";
      ERROR_TYPE["UndefinedColumn"] = "undefined_column";
      ERROR_TYPE["UndefinedValue"] = "undefined_value";
      ERROR_TYPE["UndefinedColumnName"] = "undefined_column_name";
      ERROR_TYPE["UndefinedDbName"] = "undefined_database_name";
      ERROR_TYPE["UndefinedColumnValue"] = "undefined_column_value";
      ERROR_TYPE["NotArray"] = "not_array";
      ERROR_TYPE["NoValueSupplied"] = "no_value_supplied";
      ERROR_TYPE["ColumnNotExist"] = "column_not_exist";
      ERROR_TYPE["EnableSearchOff"] = "enable_search_off";
      ERROR_TYPE["InvalidOp"] = "invalid_operator";
      ERROR_TYPE["NullValue"] = "null_value";
      ERROR_TYPE["WrongDataType"] = "wrong_data_type";
      ERROR_TYPE["TableNotExist"] = "table_not_exist";
      ERROR_TYPE["DbNotExist"] = "db_not_exist";
      ERROR_TYPE["ConnectionAborted"] = "connection_aborted";
      ERROR_TYPE["ConnectionClosed"] = "connection_closed";
      ERROR_TYPE["NotObject"] = "not_object";
      ERROR_TYPE["InvalidConfig"] = "invalid_config";
      ERROR_TYPE["DbBlocked"] = "Db_blocked";
      ERROR_TYPE["IndexedDbNotSupported"] = "indexeddb_not_supported";
      ERROR_TYPE["NullValueInWhere"] = "null_value_in_where";
      ERROR_TYPE["InvalidJoinQuery"] = "invalid_join_query";
      ERROR_TYPE["InvalidOrderQuery"] = "invalid_order_query";
      ERROR_TYPE["InvalidQuery"] = "invalid_query";
      ERROR_TYPE["InvalidGroupQuery"] = "invalid_group_query";
      ERROR_TYPE["ImportScriptsFailed"] = "import_scripts_failed";
      ERROR_TYPE["MethodNotExist"] = "method_not_exist";
    })(ERROR_TYPE || (ERROR_TYPE = {}));

    var WORKER_STATUS;

    (function (WORKER_STATUS) {
      WORKER_STATUS["Registered"] = "registerd";
      WORKER_STATUS["Failed"] = "failed";
      WORKER_STATUS["NotStarted"] = "not_started";
    })(WORKER_STATUS || (WORKER_STATUS = {}));

    var DATA_TYPE;

    (function (DATA_TYPE) {
      DATA_TYPE["String"] = "string";
      DATA_TYPE["Object"] = "object";
      DATA_TYPE["Array"] = "array";
      DATA_TYPE["Number"] = "number";
      DATA_TYPE["Boolean"] = "boolean";
      DATA_TYPE["Null"] = "null";
      DATA_TYPE["DateTime"] = "date_time";
    })(DATA_TYPE || (DATA_TYPE = {}));

    var API;

    (function (API) {
      API["InitDb"] = "init_db";
      API["IsDbExist"] = "is_db_exist";
      API["GetDbVersion"] = "get_db_version";
      API["GetDbList"] = "get_db_list";
      API["Get"] = "get";
      API["Set"] = "set";
      API["Select"] = "select";
      API["Insert"] = "insert";
      API["Update"] = "update";
      API["Remove"] = "remove";
      API["GetDbSchema"] = "get_db_schema";
      API["OpenDb"] = "open_db";
      API["Clear"] = "clear";
      API["DropDb"] = "drop_db";
      API["Count"] = "count";
      API["ChangeLogStatus"] = "change_log_status";
      API["Terminate"] = "terminate";
      API["Transaction"] = "transaction";
      API["InitKeyStore"] = "init_keystore";
      API["CloseDb"] = "close_db";
      API["Union"] = "union";
      API["Intersect"] = "intersect";
      API["ImportScripts"] = "import_scripts";
    })(API || (API = {}));

    var EVENT;

    (function (EVENT) {
      EVENT["RequestQueueEmpty"] = "requestQueueEmpty";
      EVENT["RequestQueueFilled"] = "requestQueueFilled";
    })(EVENT || (EVENT = {}));

    var QUERY_OPTION;

    (function (QUERY_OPTION) {
      QUERY_OPTION["Where"] = "where";
      QUERY_OPTION["Like"] = "like";
      QUERY_OPTION["Regex"] = "regex";
      QUERY_OPTION["In"] = "in";
      QUERY_OPTION["Equal"] = "=";
      QUERY_OPTION["Between"] = "-";
      QUERY_OPTION["GreaterThan"] = ">";
      QUERY_OPTION["LessThan"] = "<";
      QUERY_OPTION["GreaterThanEqualTo"] = ">=";
      QUERY_OPTION["LessThanEqualTo"] = "<=";
      QUERY_OPTION["NotEqualTo"] = "!=";
      QUERY_OPTION["Aggregate"] = "aggregate";
      QUERY_OPTION["Max"] = "max";
      QUERY_OPTION["Min"] = "min";
      QUERY_OPTION["Avg"] = "avg";
      QUERY_OPTION["Count"] = "count";
      QUERY_OPTION["Sum"] = "sum";
      QUERY_OPTION["Or"] = "or";
      QUERY_OPTION["Skip"] = "skip";
      QUERY_OPTION["Limit"] = "limit";
      QUERY_OPTION["And"] = "and";
      QUERY_OPTION["IgnoreCase"] = "ignoreCase";
      QUERY_OPTION["Then"] = "then";
    })(QUERY_OPTION || (QUERY_OPTION = {}));

    var IDB_MODE;

    (function (IDB_MODE) {
      IDB_MODE["ReadOnly"] = "readonly";
      IDB_MODE["ReadWrite"] = "readwrite";
    })(IDB_MODE || (IDB_MODE = {}));

    var OCCURENCE;

    (function (OCCURENCE) {
      OCCURENCE["First"] = "f";
      OCCURENCE["Last"] = "l";
      OCCURENCE["Any"] = "a";
    })(OCCURENCE || (OCCURENCE = {}));

    var CONNECTION_STATUS;

    (function (CONNECTION_STATUS) {
      CONNECTION_STATUS["Connected"] = "connected";
      CONNECTION_STATUS["Closed"] = "closed";
      CONNECTION_STATUS["NotStarted"] = "not_started";
      CONNECTION_STATUS["UnableToStart"] = "unable_to_start";
      CONNECTION_STATUS["ClosedByJsStore"] = "closed_by_jsstore";
    })(CONNECTION_STATUS || (CONNECTION_STATUS = {})); // CONCATENATED MODULE: ./src/worker/keystore/enums.ts


    var enums_CONNECTION_STATUS;

    (function (CONNECTION_STATUS) {
      CONNECTION_STATUS["Connected"] = "connected";
      CONNECTION_STATUS["Closed"] = "closed";
      CONNECTION_STATUS["NotStarted"] = "not_connected";
    })(enums_CONNECTION_STATUS || (enums_CONNECTION_STATUS = {})); // CONCATENATED MODULE: ./src/worker/keystore/business/base_logic.ts


    var base_logic_Base =
    /** @class */
    function () {
      function Base() {
        this.results = null;
        this.errorOccured = false;
        this.errorCount = 0;
      }

      Base.prototype.onErrorOccured = function (e) {
        ++this.errorCount;

        if (this.errorCount === 1) {
          if (this.onError != null) {
            this.onError(e.target.error);
          }
        }

        console.error(e);
      };

      return Base;
    }(); // CONCATENATED MODULE: ./src/worker/keystore/business/idb_helper.ts


    var idb_helper_IdbHelper =
    /** @class */
    function () {
      function IdbHelper() {}

      IdbHelper.callDbDroppedByBrowser = function () {
        IdbHelper.isDbDeletedByBrowser = IdbHelper.dbStatus.conStatus === enums_CONNECTION_STATUS.Connected ? true : false;
      };

      IdbHelper.createTransaction = function (tableNames, callBack, mode) {
        if (IdbHelper.transaction === null) {
          mode = mode ? mode : "readwrite";
          IdbHelper.transaction = IdbHelper.dbConnection.transaction(tableNames, mode);

          IdbHelper.transaction.oncomplete = function () {
            IdbHelper.transaction = null;
            callBack();
          };

          IdbHelper.transaction.ontimeout = function () {
            this._transaction = null;
            console.error('transaction timed out');
          };
        }
      };

      IdbHelper.transaction = null;
      IdbHelper.dbStatus = {
        conStatus: enums_CONNECTION_STATUS.NotStarted
      };
      return IdbHelper;
    }(); // CONCATENATED MODULE: ./src/worker/keystore/business/remove_logic.ts


    var __extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var remove_logic_Remove =
    /** @class */
    function (_super) {
      __extends(Remove, _super);

      function Remove(key, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.rowAffected = 0;
        _this.key = key;
        _this.onSuccess = onSuccess;
        _this.onError = onError;
        return _this;
      }

      Remove.prototype.execute = function () {
        var _this = this;

        this.initTransaction();

        var removeData = function (column, value) {
          var cursorRequest = _this.objectStore.index(column).openCursor(IDBKeyRange.only(value));

          cursorRequest.onerror = function (e) {
            _this.errorOccured = true;

            _this.onErrorOccured(e);
          };

          cursorRequest.onsuccess = function (e) {
            var cursor = e.target.result;

            if (cursor) {
              cursor.delete();
              ++_this.rowAffected;
              cursor.continue();
            }
          };
        };

        if (!this.errorOccured) {
          removeData(query_executor_QueryExecutor.columnName, this.key);
        }
      };

      Remove.prototype.initTransaction = function () {
        idb_helper_IdbHelper.createTransaction([query_executor_QueryExecutor.tableName], this.onTransactionCompleted.bind(this));
        this.objectStore = idb_helper_IdbHelper.transaction.objectStore(query_executor_QueryExecutor.tableName);
      };

      Remove.prototype.onTransactionCompleted = function () {
        if (this.errorOccured === false) {
          this.onSuccess(this.rowAffected);
        }
      };

      return Remove;
    }(base_logic_Base); // CONCATENATED MODULE: ./src/worker/keystore/business/set_logic.ts


    var set_logic_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var set_logic_Set =
    /** @class */
    function (_super) {
      set_logic_extends(Set, _super);

      function Set(query, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onTransactionCompleted_ = function () {
          if (_this.errorOccured === false && _this.onSuccess) {
            _this.onSuccess(null);
          }
        };

        try {
          _this.query = query;
          _this.onSuccess = onSuccess;
          _this.onError = onError;
        } catch (ex) {
          console.error(ex);
        }

        return _this;
      }

      Set.prototype.execute = function () {
        var _this = this;

        var insertData = function () {
          var addResult = _this.objectStore.add(_this.query);

          addResult.onerror = function (e) {
            _this.errorOccured = true;

            _this.onErrorOccured(e);
          };
        };

        this.initTransaction();

        (function () {
          var cursorRequest = _this.objectStore.index(query_executor_QueryExecutor.columnName).openCursor(IDBKeyRange.only(_this.query[query_executor_QueryExecutor.columnName]));

          cursorRequest.onsuccess = function (e) {
            var cursor = e.target.result;

            if (cursor) {
              cursor.update(_this.query);
            } else {
              insertData();
            }
          };

          cursorRequest.onerror = function (e) {
            _this.errorOccured = true;

            _this.onErrorOccured(e);
          };
        })();
      };

      Set.prototype.initTransaction = function () {
        idb_helper_IdbHelper.createTransaction([query_executor_QueryExecutor.tableName], this.onTransactionCompleted_);
        this.objectStore = idb_helper_IdbHelper.transaction.objectStore(query_executor_QueryExecutor.tableName);
      };

      return Set;
    }(base_logic_Base); // CONCATENATED MODULE: ./src/worker/keystore/utils_logic.ts


    var utils_logic_Utils =
    /** @class */
    function () {
      function Utils() {}

      Utils.updateDbStatus = function (status, err) {
        if (err === undefined) {
          idb_helper_IdbHelper.dbStatus.conStatus = status;
        } else {
          idb_helper_IdbHelper.dbStatus = {
            conStatus: status,
            lastError: err
          };
        }
      };

      return Utils;
    }(); // CONCATENATED MODULE: ./src/worker/keystore/business/init_db_logic.ts


    var init_db_logic_InitDb =
    /** @class */
    function () {
      return function (dbName, onSuccess, onError) {
        var dbRequest = self.indexedDB.open(dbName, 1);
        idb_helper_IdbHelper.isDbDeletedByBrowser = false;

        dbRequest.onerror = function (event) {
          if (event.target.error.name === 'InvalidStateError') {
            onError({
              message: "Indexeddb is blocked",
              type: ERROR_TYPE.IndexedDbNotSupported
            });
          } else {
            onError(event.target.error);
          }
        };

        dbRequest.onsuccess = function () {
          idb_helper_IdbHelper.dbStatus.conStatus = enums_CONNECTION_STATUS.Connected;
          idb_helper_IdbHelper.dbConnection = dbRequest.result;

          idb_helper_IdbHelper.dbConnection.onclose = function () {
            idb_helper_IdbHelper.callDbDroppedByBrowser();
            utils_logic_Utils.updateDbStatus(enums_CONNECTION_STATUS.Closed, ERROR_TYPE.ConnectionClosed);
          };

          idb_helper_IdbHelper.dbConnection.onversionchange = function (e) {
            if (e.newVersion === null) {
              // An attempt is made to delete the db
              e.target.close(); // Manually close our connection to the db

              idb_helper_IdbHelper.callDbDroppedByBrowser();
              utils_logic_Utils.updateDbStatus(enums_CONNECTION_STATUS.Closed, ERROR_TYPE.ConnectionClosed);
            }
          };

          idb_helper_IdbHelper.dbConnection.onerror = function (e) {
            idb_helper_IdbHelper.dbStatus.lastError = "Error occured in connection :" + e.target.result;
          };

          idb_helper_IdbHelper.dbConnection.onabort = function () {
            idb_helper_IdbHelper.dbStatus = {
              conStatus: enums_CONNECTION_STATUS.Closed,
              lastError: "Connection aborted"
            };
          };

          if (onSuccess != null) {
            onSuccess();
          }
        };

        dbRequest.onupgradeneeded = function (event) {
          var db = event.target.result,
              column = "Key";
          db.createObjectStore(query_executor_QueryExecutor.tableName, {
            keyPath: column
          }).createIndex(column, column, {
            unique: true
          });
        };
      };
    }(); // CONCATENATED MODULE: ./src/worker/keystore/business/get_logic.ts


    var get_logic_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var get_logic_Get =
    /** @class */
    function (_super) {
      get_logic_extends(Get, _super);

      function Get(key, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onTransactionCompleted_ = function () {
          if (_this.errorOccured === false) {
            _this.onSuccess(_this.results);
          }
        };

        _this.key = key;
        _this.onSuccess = onSuccess;
        _this.onError = onError;
        return _this;
      }

      Get.prototype.execute = function () {
        var _this = this;

        this.initTransaction_();

        (function (column, value) {
          var cursorRequest = _this.objectStore.index(column).openCursor(IDBKeyRange.only(value));

          cursorRequest.onerror = function (e) {
            _this.errorOccured = true;

            _this.onErrorOccured(e);
          };

          cursorRequest.onsuccess = function (e) {
            var cursor = e.target.result;

            if (cursor) {
              _this.results = cursor.value['Value'];
            }
          };
        })(query_executor_QueryExecutor.columnName, this.key);
      };

      Get.prototype.initTransaction_ = function () {
        idb_helper_IdbHelper.createTransaction([query_executor_QueryExecutor.tableName], this.onTransactionCompleted_, 'readonly');
        this.objectStore = idb_helper_IdbHelper.transaction.objectStore(query_executor_QueryExecutor.tableName);
      };

      return Get;
    }(base_logic_Base); // CONCATENATED MODULE: ./src/worker/keystore/business/main_logic.ts


    var main_logic_Main =
    /** @class */
    function () {
      function Main(onQueryFinished) {
        if (onQueryFinished === void 0) {
          onQueryFinished = null;
        }

        this.onQueryFinished = onQueryFinished;
      }

      Main.prototype.checkConnectionAndExecuteLogic = function (request) {
        var _this = this;

        if (request.name === 'init_db') {
          this.executeLogic(request);
        } else {
          switch (idb_helper_IdbHelper.dbStatus.conStatus) {
            case enums_CONNECTION_STATUS.Connected:
              this.executeLogic(request);
              break;

            case enums_CONNECTION_STATUS.NotStarted:
              setTimeout(function () {
                _this.checkConnectionAndExecuteLogic(request);
              }, 100);
              break;

            case enums_CONNECTION_STATUS.Closed:
              if (idb_helper_IdbHelper.isDbDeletedByBrowser) {
                this.createDb(function () {
                  idb_helper_IdbHelper.isDbDeletedByBrowser = false;

                  _this.checkConnectionAndExecuteLogic(request);
                }, function (err) {
                  console.error(err);
                });
              }

          }
        }
      };

      Main.prototype.returnResult = function (result) {
        this.onQueryFinished(result);
      };

      Main.prototype.executeLogic = function (request) {
        var _this = this;

        var onSuccess = function (results) {
          _this.returnResult({
            returnedValue: results
          });
        };

        var onError = function (err) {
          _this.returnResult({
            errorDetails: err,
            errorOccured: true
          });
        };

        switch (request.name) {
          case 'get':
            this.get(request.query, onSuccess, onError);
            break;

          case 'set':
            this.set(request.query, onSuccess, onError);
            break;

          case 'remove':
            this.remove(request.query, onSuccess, onError);
            break;

          case 'init_db':
            this.createDb(onSuccess, onError);
            break;

          case 'close_db':
            this.closeDb(onSuccess, onError);
            break;
        }
      };

      Main.prototype.set = function (query, onSuccess, onError) {
        var insertInstance = new set_logic_Set(query, onSuccess, onError);
        insertInstance.execute();
      };

      Main.prototype.remove = function (key, onSuccess, onError) {
        var deleteInstance = new remove_logic_Remove(key, onSuccess, onError);
        deleteInstance.execute();
      };

      Main.prototype.get = function (key, onSuccess, onError) {
        var getInstance = new get_logic_Get(key, onSuccess, onError);
        getInstance.execute();
      };

      Main.prototype.createDb = function (onSuccess, onError) {
        new init_db_logic_InitDb("KeyStore", onSuccess, onError);
      };

      Main.prototype.closeDb = function (onSuccess) {
        if (idb_helper_IdbHelper.dbStatus.conStatus === enums_CONNECTION_STATUS.Connected) {
          idb_helper_IdbHelper.dbStatus.conStatus = enums_CONNECTION_STATUS.Closed;
          idb_helper_IdbHelper.dbConnection.close();
        }

        onSuccess();
      };

      return Main;
    }(); // CONCATENATED MODULE: ./src/worker/helpers/promise.ts


    var promise = function (callBack) {
      return new Promise(callBack);
    }; // CONCATENATED MODULE: ./src/worker/keystore/query_executor.ts


    var query_executor_QueryExecutor =
    /** @class */
    function () {
      function QueryExecutor() {}

      QueryExecutor.prcoessQuery = function (request) {
        var _this = this;

        return promise(function (resolve, reject) {
          request.onSuccess = function (result) {
            resolve(result);
          };

          request.onError = function (error) {
            console.error(error);
            reject(error);
          };

          _this.requestQueue.push(request);

          _this.executeCode();
        });
      };

      QueryExecutor.executeCode = function () {
        if (!this.isCodeExecuting && this.requestQueue.length > 0) {
          this.isCodeExecuting = true;
          var request = {
            name: this.requestQueue[0].name,
            query: this.requestQueue[0].query
          };
          new main_logic_Main(this.onQueryFinished.bind(this)).checkConnectionAndExecuteLogic(request);
        }
      };

      QueryExecutor.onQueryFinished = function (message) {
        var finishedRequest = this.requestQueue.shift();
        this.isCodeExecuting = false;

        if (message.errorOccured) {
          finishedRequest.onError(message.errorDetails);
        } else {
          finishedRequest.onSuccess(message.returnedValue);
        }

        this.executeCode();
      };

      QueryExecutor.requestQueue = [];
      QueryExecutor.tableName = "LocalStore";
      QueryExecutor.columnName = "Key";
      QueryExecutor.isCodeExecuting = false;
      return QueryExecutor;
    }(); // CONCATENATED MODULE: ./src/worker/keystore/instance.ts


    var instance_KeyStore =
    /** @class */
    function () {
      function KeyStore() {}
      /**
       * Initialize KeyStore
       *
       */


      KeyStore.init = function () {
        if (indexedDB) {
          return query_executor_QueryExecutor.prcoessQuery({
            name: 'init_db',
            query: null
          });
        }
      };

      KeyStore.close = function () {
        return query_executor_QueryExecutor.prcoessQuery({
          name: 'close_db',
          query: null
        });
      };
      /**
       * return the value by key
       *
       * @param {string} key
       * @param {(result) => void} onSuccess
       * @param {(err: IError) => void} [onError=null]
       * @returns
       */


      KeyStore.get = function (key) {
        return query_executor_QueryExecutor.prcoessQuery({
          name: 'get',
          query: key
        });
      };
      /**
       * insert or update value
       *
       * @param {any} key
       * @param {any} value
       * @param {(result) => void} [onSuccess]
       * @param {(err: IError) => void} [onError]
       * @returns
       */


      KeyStore.set = function (key, value) {
        return query_executor_QueryExecutor.prcoessQuery({
          name: 'set',
          query: {
            Key: key,
            Value: value
          }
        });
      };
      /**
       * delete value
       *
       * @param {string} key
       * @param {(result) => void} [onSuccess=null]
       * @param {(err: IError) => void} [onError=null]
       * @returns
       */


      KeyStore.remove = function (key) {
        return query_executor_QueryExecutor.prcoessQuery({
          name: 'remove',
          query: key
        });
      };

      return KeyStore;
    }(); // CONCATENATED MODULE: ./src/worker/config.ts


    var Config =
    /** @class */
    function () {
      function Config() {}

      Config.isLogEnabled = false;
      Config.isRuningInWorker = false;
      return Config;
    }(); // CONCATENATED MODULE: ./src/worker/log_helper.ts


    var log_helper_LogHelper =
    /** @class */
    function () {
      function LogHelper(type, info) {
        if (info === void 0) {
          info = null;
        }

        this.type = type;
        this.info_ = info;
        this.message = this.getMsg_();
      }

      LogHelper.prototype.throw = function () {
        throw this.get();
      };

      LogHelper.log = function (msg) {
        if (Config.isLogEnabled) {
          console.log(msg);
        }
      };

      LogHelper.prototype.logError = function () {
        console.error(this.get());
      };

      LogHelper.prototype.get = function () {
        return {
          message: this.message,
          type: this.type
        };
      };

      LogHelper.prototype.getMsg_ = function () {
        var errMsg;

        switch (this.type) {
          case ERROR_TYPE.NotArray:
            errMsg = "Supplied value is not an array";
            break;

          case ERROR_TYPE.UndefinedColumn:
            errMsg = "Column is undefined in Where";
            break;

          case ERROR_TYPE.UndefinedValue:
            errMsg = "Value is undefined in Where";
            break;

          case ERROR_TYPE.UndefinedColumnName:
            errMsg = "Column name is undefined '" + this.info_['TableName'] + "'";
            break;

          case ERROR_TYPE.UndefinedDbName:
            errMsg = "Database name is not supplied";
            break;

          case ERROR_TYPE.UndefinedColumnValue:
            errMsg = "Column value is undefined";
            break;

          case ERROR_TYPE.NoValueSupplied:
            errMsg = "No value is supplied";
            break;

          case ERROR_TYPE.InvalidOp:
            errMsg = "Invalid Op Value '" + this.info_['Op'] + "'";
            break;

          case ERROR_TYPE.ColumnNotExist:
            errMsg = this.info_['isOrder'] ? "Column '" + this.info_['column'] + "' in order query does not exist" : "Column '" + this.info_['column'] + "' does not exist";
            break;

          case ERROR_TYPE.EnableSearchOff:
            errMsg = "Search is turned off for the Column '" + this.info_['column'] + "'";
            break;

          case ERROR_TYPE.NullValue:
            errMsg = "Null value is not allowed for column '" + this.info_['ColumnName'] + "'";
            break;

          case ERROR_TYPE.WrongDataType:
            errMsg = "Supplied value for column '" + this.info_['column'] + "' have wrong data type";
            break;

          case ERROR_TYPE.TableNotExist:
            errMsg = "Table '" + this.info_['tableName'] + "' does not exist";
            break;

          case ERROR_TYPE.DbNotExist:
            errMsg = "Database with name " + this.info_['dbName'] + " does not exist";
            break;

          case ERROR_TYPE.NotObject:
            errMsg = "supplied value is not object";
            break;

          case ERROR_TYPE.InvalidOp:
            errMsg = "Invalid Config '" + this.info_['Config'] + " '";
            break;

          case ERROR_TYPE.DbBlocked:
            errMsg = "database is blocked, cant be deleted right now";
            break;

          case ERROR_TYPE.NullValueInWhere:
            errMsg = "Null/undefined is not allowed in where. Column '" + this.info_['column'] + "' has null";
            break;

          case ERROR_TYPE.InvalidJoinQuery:
            errMsg = this.info_;
            break;

          default:
            errMsg = this.message;
            break;
        }

        return errMsg;
      };

      return LogHelper;
    }(); // CONCATENATED MODULE: ./src/worker/business/base_db.ts


    var base_db_BaseDb =
    /** @class */
    function () {
      function BaseDb() {}

      Object.defineProperty(BaseDb.prototype, "dbName", {
        get: function () {
          return business_idb_helper_IdbHelper.activeDb.name;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BaseDb.prototype, "dbStatus", {
        get: function () {
          return business_idb_helper_IdbHelper.dbStatus;
        },
        set: function (value) {
          business_idb_helper_IdbHelper.dbStatus = value;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BaseDb.prototype, "dbConnection", {
        get: function () {
          return business_idb_helper_IdbHelper.dbConnection;
        },
        set: function (value) {
          business_idb_helper_IdbHelper.dbConnection = value;
        },
        enumerable: false,
        configurable: true
      });

      BaseDb.prototype.updateDbStatus = function (status, err) {
        business_idb_helper_IdbHelper.updateDbStatus(status, err);
      };

      BaseDb.prototype.onDbDroppedByBrowser = function (deleteMetaData) {
        business_idb_helper_IdbHelper.callDbDroppedByBrowser(deleteMetaData);
      };

      Object.defineProperty(BaseDb.prototype, "dbVersion", {
        get: function () {
          return parseInt(business_idb_helper_IdbHelper.activeDbVersion);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BaseDb.prototype, "activeDb", {
        get: function () {
          return business_idb_helper_IdbHelper.activeDb;
        },
        enumerable: false,
        configurable: true
      });

      BaseDb.prototype.getDbList = function () {
        return business_idb_helper_IdbHelper.getDbList();
      };

      BaseDb.prototype.setDbList = function (value) {
        return business_idb_helper_IdbHelper.setDbList(value);
      };

      BaseDb.prototype.onDbClose = function () {
        this.onDbDroppedByBrowser();
        this.updateDbStatus(CONNECTION_STATUS.Closed, ERROR_TYPE.ConnectionClosed);
      };

      BaseDb.prototype.onDbVersionChange = function (e) {
        if (e.newVersion === null) {
          // An attempt is made to delete the db
          e.target.close(); // Manually close our connection to the db

          this.onDbDroppedByBrowser(true);
          this.updateDbStatus(CONNECTION_STATUS.Closed, ERROR_TYPE.ConnectionClosed);
        }
      };

      BaseDb.prototype.onDbConError = function (e) {
        business_idb_helper_IdbHelper.dbStatus.lastError = "Error occured in connection :" + e.target.result;
      };

      return BaseDb;
    }(); // CONCATENATED MODULE: ./src/worker/business/drop_db.ts


    var drop_db_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var drop_db_DropDb =
    /** @class */
    function (_super) {
      drop_db_extends(DropDb, _super);

      function DropDb(onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onSuccess_ = onSuccess;
        _this.onError_ = onError;
        return _this;
      }

      DropDb.prototype.deleteMetaData = function () {
        var _this = this;

        return promise(function (res, rej) {
          instance_KeyStore.remove("JsStore_" + _this.dbName + "_Db_Version");

          _this.activeDb.tables.forEach(function (table) {
            instance_KeyStore.remove("JsStore_" + _this.dbName + "_" + table.name + "_Version");
            table.columns.forEach(function (column) {
              if (column.autoIncrement) {
                instance_KeyStore.remove("JsStore_" + _this.dbName + "_" + table.name + "_" + column.name + "_Value");
              }
            });
          }); // remove from database_list 


          _this.getDbList().then(function (dbList) {
            dbList.splice(dbList.indexOf(_this.dbName), 1);

            _this.setDbList(dbList).then(function () {
              // remove db schema from keystore
              instance_KeyStore.remove("JsStore_" + _this.dbName + "_Schema").then(res).catch(rej);
            });
          });
        });
      };

      DropDb.prototype.deleteDb = function () {
        var _this = this;

        setTimeout(function () {
          var dropDbRequest = indexedDB.deleteDatabase(_this.dbName);

          dropDbRequest.onblocked = function () {
            if (_this.onError_ != null) {
              _this.onError_(new log_helper_LogHelper(ERROR_TYPE.DbBlocked).get());
            }
          };

          dropDbRequest.onerror = function () {
            if (_this.onError_ != null) {
              _this.onError_(event.target.error);
            }
          };

          dropDbRequest.onsuccess = function () {
            _this.deleteMetaData().then(function () {
              _this.onSuccess_();

              _this.dbStatus.conStatus = CONNECTION_STATUS.Closed;
            }).catch(_this.onError_);
          };
        }, 100);
      };

      return DropDb;
    }(base_db_BaseDb); // CONCATENATED MODULE: ./src/worker/business/idb_helper.ts


    var business_idb_helper_IdbHelper =
    /** @class */
    function () {
      function IdbHelper() {}

      IdbHelper.callDbDroppedByBrowser = function (deleteMetaData) {
        if (IdbHelper.dbStatus.conStatus === CONNECTION_STATUS.Connected) {
          IdbHelper.isDbDeletedByBrowser = true;

          if (deleteMetaData === true) {
            var dropDbObject = new drop_db_DropDb(function () {}, function () {});
            dropDbObject.deleteMetaData();
          }
        }
      };

      IdbHelper.createTransaction = function (tableNames, callBack, mode) {
        if (IdbHelper.transaction === null) {
          mode = mode ? mode : IDB_MODE.ReadWrite;
          IdbHelper.transaction = IdbHelper.dbConnection.transaction(tableNames, mode);

          var onComplete = function () {
            IdbHelper.transaction = null;
            callBack();
          };

          IdbHelper.transaction.oncomplete = onComplete;
          IdbHelper.transaction.onabort = onComplete;
        }
      };

      IdbHelper.setDbList = function (list) {
        return instance_KeyStore.set('DataBase_List', list);
      };

      IdbHelper.updateDbStatus = function (status, err) {
        if (err === undefined) {
          IdbHelper.dbStatus.conStatus = status;
        } else {
          IdbHelper.dbStatus = {
            conStatus: status,
            lastError: err
          };
        }
      };

      IdbHelper.getDbList = function () {
        return promise(function (res, rej) {
          instance_KeyStore.get('DataBase_List').then(function (result) {
            res(result == null ? [] : result);
          }).catch(rej);
        });
      };

      IdbHelper.getDbVersion = function (dbName) {
        return promise(function (res, rej) {
          instance_KeyStore.get("JsStore_" + dbName + "_Db_Version").then(function (dbVersion) {
            res(Number(dbVersion));
          }).catch(rej);
        });
      };

      IdbHelper.getDbSchema = function (dbName) {
        return instance_KeyStore.get("JsStore_" + dbName + "_Schema");
      };

      IdbHelper.getTable = function (tableName) {
        var currentTable = IdbHelper.activeDb.tables.find(function (table) {
          return table.name === tableName;
        });
        return currentTable;
      };

      IdbHelper.transaction = null;
      IdbHelper.activeDbVersion = 0;
      IdbHelper.dbStatus = {
        conStatus: CONNECTION_STATUS.NotStarted
      };
      return IdbHelper;
    }(); // CONCATENATED MODULE: ./src/worker/utils/is_null.ts


    var isNull = function (value) {
      if (value == null) {
        return true;
      } else {
        switch (typeof value) {
          case 'string':
            return value.length === 0;

          case 'number':
            return isNaN(value);
        }
      }

      return false;
    }; // CONCATENATED MODULE: ./src/worker/utils/get_data_type.ts


    var getDataType = function (value) {
      if (value == null) {
        return DATA_TYPE.Null;
      }

      var type = typeof value;

      switch (type) {
        case 'object':
          if (Array.isArray(value)) {
            return DATA_TYPE.Array;
          }

          if (value instanceof Date) {
            return DATA_TYPE.DateTime;
          }

      }

      return type;
    }; // CONCATENATED MODULE: ./src/worker/business/update/schema_checker.ts


    var schema_checker_SchemaChecker =
    /** @class */
    function () {
      function SchemaChecker(table) {
        this.table = table;
      }

      SchemaChecker.prototype.check = function (setValue, tblName) {
        var _this = this;

        var log = null;

        if (typeof setValue === DATA_TYPE.Object) {
          if (this.table) {
            // loop through table column and find data is valid
            this.table.columns.every(function (column) {
              if (log === null) {
                if (column.name in setValue) {
                  log = _this.checkByColumn_(column, setValue[column.name]);
                }

                return true;
              } else {
                return false;
              }
            });
          } else {
            log = new log_helper_LogHelper(ERROR_TYPE.TableNotExist, {
              tableName: tblName
            });
          }
        } else {
          log = new log_helper_LogHelper(ERROR_TYPE.NotObject);
        }

        if (log != null) {
          return log.get();
        }

        return null;
      };

      SchemaChecker.prototype.checkByColumn_ = function (column, value) {
        var log = null; // check not null schema

        if (column.notNull === true && isNull(value)) {
          log = new log_helper_LogHelper(ERROR_TYPE.NullValue, {
            ColumnName: column.name
          });
        } // check datatype


        var type = getDataType(value);
        var checkFurther = value != null;

        if (column.dataType && checkFurther) {
          if (type !== column.dataType && type !== 'object') {
            log = new log_helper_LogHelper(ERROR_TYPE.WrongDataType, {
              column: column.name
            });
          }
        } // check allowed operators


        if (checkFurther && type === 'object') {
          var allowedOp = ['+', '-', '*', '/', '{push}'];

          for (var prop in value) {
            if (allowedOp.indexOf(prop) < 0 && column.dataType && type !== column.dataType) {
              log = new log_helper_LogHelper(ERROR_TYPE.WrongDataType, {
                column: column.name
              });
            }

            break;
          }
        }

        return log;
      };

      return SchemaChecker;
    }(); // CONCATENATED MODULE: ./src/worker/business/insert/value_checker.ts


    var value_checker_ValueChecker =
    /** @class */
    function () {
      function ValueChecker(table, autoIncrementValue) {
        this.errorOccured = false;
        this.autoIncrementValue = {};
        this.table = table;
        this.autoIncrementValue = autoIncrementValue;
      }

      ValueChecker.prototype.checkAndModifyValue = function (value) {
        var _this = this;

        this.value = value;
        this.table.columns.every(function (column) {
          _this.checkAndModifyColumnValue_(column);

          return !_this.errorOccured;
        });
        return this.errorOccured;
      };

      ValueChecker.prototype.checkNotNullAndDataType_ = function (column) {
        // check not null schema
        if (column.notNull && isNull(this.value[column.name])) {
          this.onValidationError_(ERROR_TYPE.NullValue, {
            ColumnName: column.name
          });
        } // check datatype
        else if (column.dataType && !isNull(this.value[column.name]) && getDataType(this.value[column.name]) !== column.dataType) {
            this.onValidationError_(ERROR_TYPE.WrongDataType, {
              column: column.name
            });
          }
      };

      ValueChecker.prototype.checkAndModifyColumnValue_ = function (column) {
        var columnValue = this.value[column.name]; // check auto increment scheme

        if (column.autoIncrement) {
          // if value is null, then create the autoincrement value
          if (isNull(columnValue)) {
            this.value[column.name] = ++this.autoIncrementValue[column.name];
          } else {
            if (getDataType(columnValue) === DATA_TYPE.Number) {
              // if column value is greater than autoincrement value saved, then make the
              // column value as autoIncrement value
              if (columnValue > this.autoIncrementValue[column.name]) {
                this.autoIncrementValue[column.name] = columnValue;
              }
            }
          }
        } // check Default Schema
        else if (column.default !== undefined && isNull(columnValue)) {
            this.value[column.name] = column.default;
          }

        this.checkNotNullAndDataType_(column);
      };

      ValueChecker.prototype.onValidationError_ = function (error, details) {
        this.errorOccured = true;
        this.log = new log_helper_LogHelper(error, details);
      };

      return ValueChecker;
    }(); // CONCATENATED MODULE: ./src/worker/helpers/promise_all.ts


    var promiseAll = function (promises) {
      return Promise.all(promises);
    }; // CONCATENATED MODULE: ./src/worker/helpers/auto_increment_helper.ts


    var getAutoIncrementValues = function (table) {
      var autoIncColumns = table.columns.filter(function (col) {
        return col.autoIncrement;
      });
      return promise(function (resolve, reject) {
        promiseAll(autoIncColumns.map(function (column) {
          var autoIncrementKey = "JsStore_" + business_idb_helper_IdbHelper.activeDb.name + "_" + table.name + "_" + column.name + "_Value";
          return instance_KeyStore.get(autoIncrementKey);
        })).then(function (results) {
          var autoIncValues = {};

          for (var i = 0; i < autoIncColumns.length; i++) {
            autoIncValues[autoIncColumns[i].name] = results[i];
          }

          resolve(autoIncValues);
        }).catch(reject);
      });
    };

    var setAutoIncrementValue = function (table, autoIncrementValue) {
      var keys = Object.keys(autoIncrementValue);
      return promiseAll(keys.map(function (columnName) {
        var autoIncrementKey = "JsStore_" + business_idb_helper_IdbHelper.activeDb.name + "_" + table.name + "_" + columnName + "_Value";
        var value = autoIncrementValue[columnName];

        if (worker_query_executor_QueryExecutor.isTransactionQuery === true) {
          query_helper_QueryHelper.autoIncrementValues[table.name][columnName] = value;
        }

        return instance_KeyStore.set(autoIncrementKey, value);
      }));
    }; // CONCATENATED MODULE: ./src/worker/business/insert/values_checker.ts


    var values_checker_ValuesChecker =
    /** @class */
    function () {
      function ValuesChecker(table, values) {
        this.table = table;
        this.values = values;
      }

      ValuesChecker.prototype.checkAndModifyValues = function () {
        var _this = this;

        return promise(function (resolve, reject) {
          var onAutoIncValueEvaluated = function (autoIncrementValues) {
            _this.valueCheckerObj = new value_checker_ValueChecker(_this.table, autoIncrementValues);

            _this.startChecking().then(resolve).catch(reject);
          };

          if (worker_query_executor_QueryExecutor.isTransactionQuery === false) {
            getAutoIncrementValues(_this.table).then(function (autoIncValues) {
              onAutoIncValueEvaluated(autoIncValues);
            }).catch(reject);
          } else {
            onAutoIncValueEvaluated(query_helper_QueryHelper.autoIncrementValues[_this.table.name]);
          }
        });
      };

      ValuesChecker.prototype.startChecking = function () {
        var _this = this;

        return promise(function (resolve, reject) {
          var isError = false;

          _this.values.every(function (item) {
            isError = _this.valueCheckerObj.checkAndModifyValue(item);
            return !isError;
          });

          if (isError) {
            var error = _this.valueCheckerObj.log.get();

            reject(error);
          }

          var promiseObj = setAutoIncrementValue(_this.table, _this.valueCheckerObj.autoIncrementValue);

          if (worker_query_executor_QueryExecutor.isTransactionQuery === false) {
            promiseObj.then(resolve).catch(reject);
          } else {
            resolve();
          }
        });
      };

      return ValuesChecker;
    }(); // CONCATENATED MODULE: ./src/worker/business/query_helper.ts


    var query_helper_QueryHelper =
    /** @class */
    function () {
      function QueryHelper(api, query) {
        this.isTransaction = false;
        this.api = api;
        this.query = query;
      }

      QueryHelper.prototype.checkAndModify = function () {
        var _this = this;

        return promise(function (resolve, reject) {
          var resolveReject = function () {
            if (_this.error == null) {
              resolve();
            } else {
              reject(_this.error);
            }
          };

          switch (_this.api) {
            case API.Select:
            case API.Remove:
            case API.Count:
              _this.checkFetchQuery_();

              resolveReject();
              break;

            case API.Insert:
              _this.checkInsertQuery_().then(resolveReject).catch(function (err) {
                _this.error = err;
                resolveReject();
              });

              break;

            case API.Update:
              _this.checkUpdateQuery_();

              resolveReject();
              break;
          }
        });
      };

      QueryHelper.prototype.isInsertQryValid_ = function (callBack) {
        var table = this.getTable_(this.query.into);
        var log;

        if (table) {
          switch (getDataType(this.query.values)) {
            case DATA_TYPE.Array:
              break;

            case DATA_TYPE.Null:
              log = new log_helper_LogHelper(ERROR_TYPE.NoValueSupplied);
              break;

            default:
              log = new log_helper_LogHelper(ERROR_TYPE.NotArray);
          }
        } else {
          log = new log_helper_LogHelper(ERROR_TYPE.TableNotExist, {
            tableName: this.query.into
          });
        }

        callBack(table);
        return log == null ? null : log.get();
      };

      QueryHelper.prototype.checkInsertQuery_ = function () {
        var _this = this;

        return promise(function (resolve, reject) {
          var table;

          var err = _this.isInsertQryValid_(function (tbl) {
            table = tbl;
          });

          if (err == null) {
            if (_this.query.skipDataCheck === true) {
              resolve();
            } else {
              var valueCheckerInstance_1 = new values_checker_ValuesChecker(table, _this.query.values);
              valueCheckerInstance_1.checkAndModifyValues().then(function () {
                _this.query.values = valueCheckerInstance_1.values;
                resolve();
              }).catch(reject);
            }
          } else {
            reject(err);
          }
        });
      };

      QueryHelper.prototype.checkUpdateQuery_ = function () {
        this.error = new schema_checker_SchemaChecker(this.getTable_(this.query.in)).check(this.query.set, this.query.in);

        if (this.error == null) {
          if (this.query.where != null) {
            this.checkForNullInWhere_();

            if (this.error == null) {
              this.addGreatAndLessToNotOp_();
            }
          }
        }
      };

      QueryHelper.prototype.checkForNullInWhere_ = function () {
        for (var key in this.query.where) {
          if (this.query.where[key] == null) {
            this.error = new log_helper_LogHelper(ERROR_TYPE.NullValueInWhere, {
              column: key
            }).get();
            return;
          }
        }
      };

      QueryHelper.prototype.checkFetchQuery_ = function () {
        if (this.isTableExist_(this.query.from) === true) {
          if (this.query.where != null) {
            this.checkForNullInWhere_();

            if (this.error == null) {
              this.addGreatAndLessToNotOp_();
            }
          }
        } else {
          this.error = new log_helper_LogHelper(ERROR_TYPE.TableNotExist, {
            tableName: this.query.from
          }).get();
        }
      };

      QueryHelper.prototype.isTableExist_ = function (tableName) {
        var index = this.activeDb_.tables.findIndex(function (table) {
          return table.name === tableName;
        });
        return index >= 0;
      };

      Object.defineProperty(QueryHelper.prototype, "activeDb_", {
        get: function () {
          return business_idb_helper_IdbHelper.activeDb;
        },
        enumerable: false,
        configurable: true
      });

      QueryHelper.prototype.getTable_ = function (tableName) {
        return business_idb_helper_IdbHelper.getTable(tableName);
      };

      QueryHelper.prototype.addGreatAndLessToNotOp_ = function () {
        var whereQuery = this.query.where;

        var containsNot = function (qry, keys) {
          return keys.findIndex(function (key) {
            return qry[key][QUERY_OPTION.NotEqualTo] != null;
          }) >= 0;
        };

        var addToSingleQry = function (qry, keys) {
          var value;
          keys.forEach(function (prop) {
            value = qry[prop];

            if (value[QUERY_OPTION.NotEqualTo] != null) {
              qry[prop][QUERY_OPTION.GreaterThan] = value[QUERY_OPTION.NotEqualTo];

              if (qry[QUERY_OPTION.Or] === undefined) {
                qry[QUERY_OPTION.Or] = {};
                qry[QUERY_OPTION.Or][prop] = {};
              } else if (qry[QUERY_OPTION.Or][prop] === undefined) {
                qry[QUERY_OPTION.Or][prop] = {};
              }

              qry[QUERY_OPTION.Or][prop][QUERY_OPTION.LessThan] = value[QUERY_OPTION.NotEqualTo];
              delete qry[prop][QUERY_OPTION.NotEqualTo];
            }
          });
          return qry;
        };

        switch (getDataType(whereQuery)) {
          case DATA_TYPE.Object:
            var queryKeys = Object.keys(whereQuery);

            if (containsNot(whereQuery, queryKeys)) {
              if (queryKeys.length === 1) {
                this.query.where = addToSingleQry(whereQuery, queryKeys);
              } else {
                var whereTmpQry_1 = [];
                queryKeys.forEach(function (prop) {
                  var _a;

                  whereTmpQry_1.push(addToSingleQry((_a = {}, _a[prop] = whereQuery[prop], _a), [prop]));
                });
                this.query.where = whereTmpQry_1;
              }
            }

            break;

          default:
            var whereTmp_1 = [];
            whereQuery.forEach(function (qry) {
              var qryKeys = Object.keys(qry);

              if (containsNot(qry, qryKeys)) {
                qry = addToSingleQry(qry, qryKeys);
              }

              whereTmp_1.push(qry);
            });
            this.query.where = whereTmp_1;
        }
      };

      QueryHelper.autoIncrementValues = {};
      return QueryHelper;
    }(); // CONCATENATED MODULE: ./src/worker/business/base_helper.ts


    var base_helper_BaseHelper =
    /** @class */
    function () {
      function BaseHelper() {}

      Object.defineProperty(BaseHelper.prototype, "activeDb", {
        //   method helpers
        get: function () {
          return business_idb_helper_IdbHelper.activeDb;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BaseHelper.prototype, "dbConnection", {
        get: function () {
          return business_idb_helper_IdbHelper.dbConnection;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BaseHelper.prototype, "transaction", {
        get: function () {
          return business_idb_helper_IdbHelper.transaction;
        },
        enumerable: false,
        configurable: true
      });

      BaseHelper.prototype.createTransaction = function (tableNames, callBack, mode) {
        business_idb_helper_IdbHelper.createTransaction(tableNames, callBack, mode);
      };

      BaseHelper.prototype.regexTest = function (value) {
        return this.regexExpression.test(value);
      };

      BaseHelper.prototype.isTableExist = function (tableName) {
        var index = this.activeDb.tables.findIndex(function (table) {
          return table.name === tableName;
        });
        return index >= 0;
      };

      BaseHelper.prototype.getTable = function (tableName) {
        return business_idb_helper_IdbHelper.getTable(tableName);
      };

      BaseHelper.prototype.getKeyRange = function (value, op) {
        var keyRange;

        switch (op) {
          case QUERY_OPTION.Between:
            keyRange = IDBKeyRange.bound(value.low, value.high, false, false);
            break;

          case QUERY_OPTION.GreaterThan:
            keyRange = IDBKeyRange.lowerBound(value, true);
            break;

          case QUERY_OPTION.GreaterThanEqualTo:
            keyRange = IDBKeyRange.lowerBound(value);
            break;

          case QUERY_OPTION.LessThan:
            keyRange = IDBKeyRange.upperBound(value, true);
            break;

          case QUERY_OPTION.LessThanEqualTo:
            keyRange = IDBKeyRange.upperBound(value);
            break;

          default:
            keyRange = IDBKeyRange.only(value);
            break;
        }

        return keyRange;
      };

      BaseHelper.prototype.getPrimaryKey = function (tableName) {
        var primaryKey = this.getTable(tableName).primaryKey;
        return primaryKey ? primaryKey : this.getKeyPath(tableName);
      };

      BaseHelper.prototype.getKeyPath = function (tableName) {
        var transaction = this.dbConnection.transaction([tableName], "readonly"),
            objectStore = transaction.objectStore(tableName);
        return objectStore.keyPath;
      };

      return BaseHelper;
    }(); // CONCATENATED MODULE: ./src/worker/utils/clone.ts


    var isObject = function (value) {
      return getDataType(value) === 'object' && !(value instanceof RegExp);
    };

    var clone = function (obj) {
      if (isObject(obj)) {
        var copy = {};

        for (var i in obj) {
          copy[i] = obj[i] != null && isObject(obj[i]) ? clone(obj[i]) : obj[i];
        }

        return copy;
      }

      return obj;
    }; // CONCATENATED MODULE: ./src/worker/utils/is_equal.ts


    var isEqual = function (val1, val2) {
      var type1 = getDataType(val1);
      var type2 = getDataType(val2);
      if (type1 !== type2) return false;

      switch (type1) {
        case DATA_TYPE.DateTime:
          return val1.getTime() === val2.getTime();

        default:
          return val1 === val2;
      }
    }; // CONCATENATED MODULE: ./src/worker/utils/get_regex_from_like_expression.ts


    var getRegexFromLikeExpression = function (likeExpression) {
      var filterValues = likeExpression.split('%');
      var filterValue;
      var occurence;

      if (filterValues[1]) {
        filterValue = filterValues[1];
        occurence = filterValues.length > 2 ? OCCURENCE.Any : OCCURENCE.Last;
      } else {
        filterValue = filterValues[0];
        occurence = OCCURENCE.First;
      }

      switch (occurence) {
        case OCCURENCE.First:
          return new RegExp("^" + filterValue, 'i');

        case OCCURENCE.Last:
          return new RegExp(filterValue + "$", 'i');

        default:
          return new RegExp("" + filterValue, 'i');
      }
    }; // CONCATENATED MODULE: ./src/worker/business/where_checker.ts

    /**
     * For matching the different column value existance for where option
     *
     * @export
     * @class WhereChecker
     */


    var where_checker_WhereChecker =
    /** @class */
    function () {
      function WhereChecker(where, checkFlag) {
        this.where = clone(where);
        this.checkFlag = checkFlag;
      }

      WhereChecker.prototype.remove = function (props) {
        var last = props.pop();
        var value = props.reduce(function (prev, curr) {
          return prev && prev[curr];
        }, this.where);
        delete value[last];
      };

      WhereChecker.prototype.check = function (rowValue) {
        var status = true;
        if (!this.checkFlag) return status;

        for (var columnName in this.where) {
          if (!status) {
            return status;
          }

          var whereColumnValue = this.where[columnName];
          var columnValue = rowValue[columnName];

          if (getDataType(whereColumnValue) === "object") {
            for (var key in whereColumnValue) {
              if (!status) {
                return status;
              }

              switch (key) {
                case QUERY_OPTION.In:
                  status = this.checkIn(columnName, columnValue);
                  break;

                case QUERY_OPTION.Like:
                  status = this.checkLike_(columnName, columnValue);
                  break;

                case QUERY_OPTION.Regex:
                  status = this.checkRegex(columnName, columnValue);
                  break;

                case QUERY_OPTION.Between:
                case QUERY_OPTION.GreaterThan:
                case QUERY_OPTION.LessThan:
                case QUERY_OPTION.GreaterThanEqualTo:
                case QUERY_OPTION.LessThanEqualTo:
                case QUERY_OPTION.NotEqualTo:
                  status = this.checkComparisionOp_(columnName, columnValue, key);
                  break;

                default:
                  status = false;
              }
            }
          } else {
            status = isEqual(whereColumnValue, columnValue);
          }
        }

        return status;
      };

      WhereChecker.prototype.checkIn = function (column, value) {
        return this.where[column][QUERY_OPTION.In].find(function (q) {
          return isEqual(q, value);
        }) != null;
      };

      WhereChecker.prototype.checkLike_ = function (column, value) {
        return getRegexFromLikeExpression(this.where[column][QUERY_OPTION.Like]).test(value);
      };

      WhereChecker.prototype.checkRegex = function (column, value) {
        return this.where[column][QUERY_OPTION.Regex].test(value);
      };

      WhereChecker.prototype.checkComparisionOp_ = function (column, value, symbol) {
        var compareValue = this.where[column][symbol];

        switch (symbol) {
          // greater than
          case QUERY_OPTION.GreaterThan:
            return value > compareValue;
          // less than

          case QUERY_OPTION.LessThan:
            return value < compareValue;
          // less than equal

          case QUERY_OPTION.LessThanEqualTo:
            return value <= compareValue;
          // greather than equal

          case QUERY_OPTION.GreaterThanEqualTo:
            return value >= compareValue;
          // between

          case QUERY_OPTION.Between:
            return value >= compareValue.low && value <= compareValue.high;
          // Not equal to

          case QUERY_OPTION.NotEqualTo:
            return value !== compareValue;
        }
      };

      return WhereChecker;
    }(); // CONCATENATED MODULE: ./src/worker/utils/get_object_first_key.ts


    var getObjectFirstKey = function (value) {
      for (var key in value) {
        return key;
      }
    }; // CONCATENATED MODULE: ./src/worker/utils/get_keys.ts


    var getKeys = function (value) {
      return Object.keys(value);
    }; // CONCATENATED MODULE: ./src/worker/utils/get_length.ts


    var getLength = function (value) {
      return getKeys(value).length;
    }; // CONCATENATED MODULE: ./src/worker/business/base.ts


    var base_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var base_Base =
    /** @class */
    function (_super) {
      base_extends(Base, _super);

      function Base() {
        var _this = _super !== null && _super.apply(this, arguments) || this;

        _this.rowAffected = 0;
        return _this;
      }

      Base.prototype.onErrorOccured = function (e, customError) {
        if (customError === void 0) {
          customError = false;
        }

        if (customError) {
          e.logError();
          this.error = e.get();
        } else {
          var error = void 0;

          if (e.name) {
            error = new log_helper_LogHelper(e.name);
            error.message = e.message;
          } else {
            error = new log_helper_LogHelper(e.target.error.name);
            error.message = e.target.error.message;
          }

          error.logError();
          this.error = error.get();
        }
      };

      Base.prototype.onExceptionOccured = function (ex) {
        console.error(ex);
        this.onError({
          message: ex.message,
          type: ERROR_TYPE.InvalidQuery
        });
      };

      Base.prototype.getColumnInfo = function (columnName, tableName) {
        return this.getTable(tableName).columns.find(function (column) {
          return column.name === columnName;
        });
      };

      Base.prototype.goToWhereLogic = function () {
        var firstColumn = getObjectFirstKey(this.query.where);

        if (this.objectStore.indexNames.contains(firstColumn)) {
          var value = this.query.where[firstColumn];

          if (getDataType(value) === 'object') {
            var checkFlag = getLength(value) > 1 || getLength(this.query.where) > 1;
            this.whereCheckerInstance = new where_checker_WhereChecker(this.query.where, checkFlag);
            var key = getObjectFirstKey(value);
            this.whereCheckerInstance.remove([firstColumn, key]);

            switch (key) {
              case QUERY_OPTION.Like:
                {
                  var regexVal = getRegexFromLikeExpression(value[QUERY_OPTION.Like]);
                  this.executeRegexLogic(firstColumn, regexVal);
                }
                break;

              case QUERY_OPTION.Regex:
                this.executeRegexLogic(firstColumn, value[QUERY_OPTION.Regex]);
                break;

              case QUERY_OPTION.In:
                this.executeInLogic(firstColumn, value[QUERY_OPTION.In]);
                break;

              case QUERY_OPTION.Between:
              case QUERY_OPTION.GreaterThan:
              case QUERY_OPTION.LessThan:
              case QUERY_OPTION.GreaterThanEqualTo:
              case QUERY_OPTION.LessThanEqualTo:
                this.executeWhereLogic(firstColumn, value, key, "next");
                break;

              case QUERY_OPTION.Aggregate:
                break;

              default:
                this.executeWhereLogic(firstColumn, value, null, "next");
            }
          } else {
            var checkFlag = getLength(this.query.where) > 1;
            this.whereCheckerInstance = new where_checker_WhereChecker(this.query.where, checkFlag);
            this.whereCheckerInstance.remove([firstColumn]);
            this.executeWhereLogic(firstColumn, value, null, "next");
          }
        } else {
          var column = this.getColumnInfo(firstColumn, this.tableName);
          var error = column == null ? new log_helper_LogHelper(ERROR_TYPE.ColumnNotExist, {
            column: firstColumn
          }) : new log_helper_LogHelper(ERROR_TYPE.EnableSearchOff, {
            column: firstColumn
          });
          this.onErrorOccured(error, true);
        }
      };

      return Base;
    }(base_helper_BaseHelper); // CONCATENATED MODULE: ./src/worker/business/clear.ts


    var clear_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var clear_Clear =
    /** @class */
    function (_super) {
      clear_extends(Clear, _super);

      function Clear(tableName, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.query = tableName;
        _this.onSuccess = onSuccess;
        _this.onError = onError;
        return _this;
      }

      Clear.prototype.execute = function () {
        var _this = this;

        this.createTransaction([this.query], function () {
          if (_this.error == null) {
            _this.onSuccess();
          } else {
            _this.onError(_this.error);
          }
        });
        var clearRequest = this.transaction.objectStore(this.query).clear();

        clearRequest.onsuccess = function () {
          var currentTable = _this.getTable(_this.query);

          currentTable.columns.forEach(function (column) {
            if (column.autoIncrement) {
              instance_KeyStore.set("JsStore_" + _this.activeDb.name + "_" + _this.query + "_" + column.name + "_Value", 0);
            }
          });
        };

        clearRequest.onerror = this.onErrorOccured;
      };

      return Clear;
    }(base_Base); // CONCATENATED MODULE: ./src/worker/business/init_db.ts


    var init_db_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var init_db_InitDb =
    /** @class */
    function (_super) {
      init_db_extends(InitDb, _super);

      function InitDb(onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onSuccess = onSuccess;
        _this.onError = onError;
        return _this;
      }

      InitDb.prototype.execute = function (tablesMetaData) {
        var _this = this;

        var listofTableCreated = [];
        var dbRequest = indexedDB.open(this.dbName, this.dbVersion);
        var isDbCreated = false;

        dbRequest.onerror = function (event) {
          if (_this.onError != null) {
            _this.onError(event.target.error);
          }
        };

        dbRequest.onsuccess = function () {
          _this.dbStatus.conStatus = CONNECTION_STATUS.Connected;
          _this.dbConnection = dbRequest.result;
          _this.dbConnection.onclose = _this.onDbClose.bind(_this);
          _this.dbConnection.onversionchange = _this.onDbVersionChange.bind(_this);
          _this.dbConnection.onerror = _this.onDbConError.bind(_this);

          if (isDbCreated) {
            // save in database list
            _this.savedbNameIntoDbList_().then(function () {
              if (_this.onSuccess != null) {
                _this.onSuccess(isDbCreated);
              }
            });
          } else {
            _this.setPrimaryKey_();

            _this.onSuccess(isDbCreated);
          }
        };

        dbRequest.onupgradeneeded = function (event) {
          isDbCreated = true;
          var dbConnection = event.target.result;

          var createObjectStore = function (item, index) {
            try {
              var store_1;

              if (item.primaryKey.length > 0) {
                _this.activeDb.tables[index].primaryKey = item.primaryKey;
                store_1 = dbConnection.createObjectStore(item.name, {
                  keyPath: item.primaryKey
                });
              } else {
                store_1 = dbConnection.createObjectStore(item.name, {
                  autoIncrement: true
                });
              }

              item.columns.forEach(function (column) {
                if (column.enableSearch === true) {
                  var options = column.primaryKey ? {
                    unique: true
                  } : {
                    unique: column.unique
                  };
                  options['multiEntry'] = column.multiEntry;
                  var keyPath = column.keyPath == null ? column.name : column.keyPath;
                  store_1.createIndex(column.name, keyPath, options);

                  if (column.autoIncrement) {
                    instance_KeyStore.set("JsStore_" + _this.dbName + "_" + item.name + "_" + column.name + "_Value", 0);
                  }
                }
              });
              listofTableCreated.push(item.name); // setting the table version

              instance_KeyStore.set("JsStore_" + _this.dbName + "_" + item.name + "_Version", item.version);
            } catch (e) {
              console.error(e);
            }
          };

          tablesMetaData.forEach(function (item, index) {
            if (item.requireDelete) {
              // Delete the old datastore.    
              if (dbConnection.objectStoreNames.contains(item.name)) {
                dbConnection.deleteObjectStore(item.name);
              }

              createObjectStore(item, index);
            } else if (item.requireCreation) {
              createObjectStore(item, index);
            }
          });
        };
      };

      InitDb.prototype.savedbNameIntoDbList_ = function () {
        var _this = this;

        return promise(function (res, rej) {
          _this.getDbList().then(function (dbList) {
            if (dbList.indexOf(_this.dbName) < 0) {
              dbList.push(_this.dbName);

              _this.setDbList(dbList).then(res).catch(rej);
            } else {
              res();
            }
          }).catch(rej);
        });
      };

      InitDb.prototype.setPrimaryKey_ = function () {
        var _this = this;

        this.activeDb.tables.forEach(function (table, index) {
          table.columns.every(function (item) {
            _this.activeDb.tables[index].primaryKey = item.primaryKey ? item.name : "";
            return !item.primaryKey;
          });
        });
      };

      return InitDb;
    }(base_db_BaseDb); // CONCATENATED MODULE: ./src/worker/business/where_base.ts


    var where_base_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var WhereBase =
    /** @class */
    function (_super) {
      where_base_extends(WhereBase, _super);

      function WhereBase() {
        var _this = _super !== null && _super.apply(this, arguments) || this;

        _this.results = [];
        return _this;
      }

      WhereBase.prototype.onQueryFinished = function () {// virtual
      };

      return WhereBase;
    }(base_Base); // CONCATENATED MODULE: ./src/worker/business/select/then_evaluator.ts


    var then_evaluator_ThenEvaluator =
    /** @class */
    function () {
      function ThenEvaluator() {}

      ThenEvaluator.prototype.setCaseAndValue = function (caseQuery, value) {
        this.caseQuery_ = caseQuery;
        this.setValue(value);
      };

      ThenEvaluator.prototype.setCaseAndColumn = function (caseQuery, columnName) {
        this.caseQuery_ = caseQuery;
        this.setColumn(columnName);
        return this;
      };

      ThenEvaluator.prototype.setColumn = function (columnName) {
        this.columnName_ = columnName;
        this.caseColumnQuery_ = this.caseQuery_[this.columnName_];
        this.length_ = this.caseColumnQuery_.length;
        return this;
      };

      ThenEvaluator.prototype.setValue = function (value) {
        this.value = value;
        return this;
      };

      ThenEvaluator.prototype.evaluate = function () {
        for (var i = 0; i < this.length_; i++) {
          if (this.checkCase_(this.caseColumnQuery_[i]) === true) {
            return this.caseColumnQuery_[i].then;
          }
        }

        var lastThen = this.caseColumnQuery_[this.length_ - 1].then;
        return lastThen == null ? this.value[this.columnName_] : lastThen;
      };

      ThenEvaluator.prototype.checkCase_ = function (cond) {
        for (var queryOption in cond) {
          switch (queryOption) {
            case QUERY_OPTION.GreaterThan:
              if (this.value[this.columnName_] > cond[queryOption]) {
                return true;
              }

              break;

            case QUERY_OPTION.Equal:
              if (this.value[this.columnName_] === cond[queryOption]) {
                return true;
              }

              break;

            case QUERY_OPTION.LessThan:
              if (this.value[this.columnName_] < cond[queryOption]) {
                return true;
              }

              break;

            case QUERY_OPTION.GreaterThanEqualTo:
              if (this.value[this.columnName_] >= cond[queryOption]) {
                return true;
              }

              break;

            case QUERY_OPTION.LessThanEqualTo:
              if (this.value[this.columnName_] <= cond[queryOption]) {
                return true;
              }

              break;

            case QUERY_OPTION.NotEqualTo:
              if (this.value[this.columnName_] !== cond[queryOption]) {
                return true;
              }

              break;

            case QUERY_OPTION.Between:
              if (this.value[this.columnName_] > cond[queryOption].low && this.value[this.columnName_] < cond[queryOption].high) {
                return true;
              }

              break;
          }

          return false;
        }
      };

      return ThenEvaluator;
    }(); // CONCATENATED MODULE: ./src/worker/business/select/base_select.ts


    var base_select_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var base_select_BaseSelect =
    /** @class */
    function (_super) {
      base_select_extends(BaseSelect, _super);

      function BaseSelect() {
        var _this = _super !== null && _super.apply(this, arguments) || this;

        _this.sorted = false;
        _this.isSubQuery = false;
        _this.shouldEvaluateLimitAtEnd = false;
        _this.shouldEvaluateSkipAtEnd = false;
        _this.thenEvaluator = new then_evaluator_ThenEvaluator();
        return _this;
      }

      BaseSelect.prototype.setPushResult = function () {
        var _this = this;

        if (this.query.case) {
          this.pushResult = function (value) {
            _this.thenEvaluator.setCaseAndValue(_this.query.case, value);

            for (var columnName in _this.query.case) {
              value[columnName] = _this.thenEvaluator.setColumn(columnName).evaluate();
            }

            _this.results.push(value);
          };
        } else {
          this.pushResult = function (value) {
            _this.results.push(value);
          };
        }
      };

      BaseSelect.prototype.removeDuplicates = function () {
        var datas = this.results; // free results memory

        this.results = null;
        var key = this.getPrimaryKey(this.query.from);
        var lookupObject = {};

        for (var i = 0, len = datas.length; i < len; i++) {
          lookupObject[datas[i][key]] = datas[i];
        }

        datas = [];

        for (var i in lookupObject) {
          datas.push(lookupObject[i]);
        }

        this.results = datas;
      };

      return BaseSelect;
    }(WhereBase); // CONCATENATED MODULE: ./src/worker/business/select/not_where.ts


    var not_where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var not_where_cursorRequest;

    var not_where_NotWhere =
    /** @class */
    function (_super) {
      not_where_extends(NotWhere, _super);

      function NotWhere() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      NotWhere.prototype.executeWhereUndefinedLogic = function () {
        if (this.query.order && this.query.order.idbSorting !== false && this.query.order.by) {
          if (this.objectStore.indexNames.contains(this.query.order.by)) {
            var orderType = this.query.order.type && this.query.order.type.toLowerCase() === 'desc' ? 'prev' : 'next';
            this.sorted = true;
            not_where_cursorRequest = this.objectStore.index(this.query.order.by).openCursor(null, orderType);
          } else {
            var error = new log_helper_LogHelper(ERROR_TYPE.ColumnNotExist, {
              column: this.query.order.by,
              isOrder: true
            });
            this.onErrorOccured(error, true);
            return;
          }
        } else {
          not_where_cursorRequest = this.objectStore.openCursor();
        }

        not_where_cursorRequest.onerror = this.onErrorOccured;

        if (this.shouldEvaluateLimitAtEnd === false && this.shouldEvaluateSkipAtEnd === false) {
          if (this.skipRecord && this.limitRecord) {
            this.executeSkipAndLimitForNoWhere_();
          } else if (this.skipRecord) {
            this.executeSkipForNoWhere_();
          } else if (this.limitRecord) {
            this.executeLimitForNotWhere_();
          } else {
            this.executeSimpleForNotWhere_();
          }
        } else {
          this.executeSimpleForNotWhere_();
        }
      };

      NotWhere.prototype.executeSkipAndLimitForNoWhere_ = function () {
        var _this = this;

        var recordSkipped = false,
            cursor;

        not_where_cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            if (recordSkipped && _this.results.length !== _this.limitRecord) {
              _this.pushResult(cursor.value);

              cursor.continue();
            } else {
              recordSkipped = true;
              cursor.advance(_this.skipRecord);
            }
          } else {
            _this.onQueryFinished();
          }
        };
      };

      NotWhere.prototype.executeSkipForNoWhere_ = function () {
        var _this = this;

        var recordSkipped = false,
            cursor;

        not_where_cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            if (recordSkipped) {
              _this.pushResult(cursor.value);

              cursor.continue();
            } else {
              recordSkipped = true;
              cursor.advance(_this.skipRecord);
            }
          } else {
            _this.onQueryFinished();
          }
        };
      };

      NotWhere.prototype.executeSimpleForNotWhere_ = function () {
        var _this = this;

        var cursor;

        not_where_cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            _this.pushResult(cursor.value);

            cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      NotWhere.prototype.executeLimitForNotWhere_ = function () {
        var _this = this;

        var cursor;

        not_where_cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor && _this.results.length !== _this.limitRecord) {
            _this.pushResult(cursor.value);

            cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      return NotWhere;
    }(base_select_BaseSelect); // CONCATENATED MODULE: ./src/worker/business/select/in.ts


    var in_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var shouldAddValue;
    var skipOrPush;
    var skip;
    var in_cursor;

    var in_In =
    /** @class */
    function (_super) {
      in_extends(In, _super);

      function In() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      In.prototype.executeInLogic = function (column, values) {
        var _this = this;

        skip = this.skipRecord;

        skipOrPush = function (val) {
          if (skip === 0) {
            _this.pushResult(val);
          } else {
            --skip;
          }
        };

        shouldAddValue = function () {
          return _this.whereCheckerInstance.check(in_cursor.value);
        };

        if (this.shouldEvaluateLimitAtEnd === false && this.shouldEvaluateSkipAtEnd === false) {
          if (this.skipRecord && this.limitRecord) {
            this.executeSkipAndLimitForIn_(column, values);
          } else if (this.skipRecord) {
            this.executeSkipForIn_(column, values);
          } else if (this.limitRecord) {
            this.executeLimitForIn_(column, values);
          } else {
            this.executeSimpleForIn_(column, values);
          }
        } else {
          this.executeSimpleForIn_(column, values);
        }
      };

      In.prototype.executeSkipAndLimitForIn_ = function (column, values) {
        var _this = this;

        var cursorRequest;
        var columnStore = this.objectStore.index(column);

        var runInLogic = function (value) {
          return promise(function (res, rej) {
            cursorRequest = columnStore.openCursor(_this.getKeyRange(value));

            cursorRequest.onsuccess = function (e) {
              in_cursor = e.target.result;

              if (_this.results.length !== _this.limitRecord && in_cursor) {
                if (shouldAddValue()) {
                  skipOrPush(in_cursor.value);
                }

                in_cursor.continue();
              } else {
                res();
              }
            };

            cursorRequest.onerror = rej;
          });
        };

        promiseAll(values.map(function (val) {
          return runInLogic(val);
        })).then(function () {
          _this.onQueryFinished();
        }).catch(function (err) {
          _this.onErrorOccured(err);
        });
      };

      In.prototype.executeSkipForIn_ = function (column, values) {
        var _this = this;

        var cursorRequest;
        var columnStore = this.objectStore.index(column);

        var runInLogic = function (value) {
          return promise(function (res, rej) {
            cursorRequest = columnStore.openCursor(_this.getKeyRange(value));

            cursorRequest.onsuccess = function (e) {
              in_cursor = e.target.result;

              if (in_cursor) {
                if (shouldAddValue()) {
                  skipOrPush(in_cursor.value);
                }

                in_cursor.continue();
              } else {
                res();
              }
            };

            cursorRequest.onerror = rej;
          });
        };

        promiseAll(values.map(function (val) {
          return runInLogic(val);
        })).then(function () {
          _this.onQueryFinished();
        }).catch(function (err) {
          _this.onErrorOccured(err);
        });
      };

      In.prototype.executeLimitForIn_ = function (column, values) {
        var _this = this;

        var cursorRequest;
        var columnStore = this.objectStore.index(column);

        var runInLogic = function (value) {
          return promise(function (res, rej) {
            cursorRequest = columnStore.openCursor(_this.getKeyRange(value));

            cursorRequest.onsuccess = function (e) {
              in_cursor = e.target.result;

              if (in_cursor && _this.results.length !== _this.limitRecord) {
                if (shouldAddValue()) {
                  _this.pushResult(in_cursor.value);
                }

                in_cursor.continue();
              } else {
                res();
              }
            };

            cursorRequest.onerror = rej;
          });
        };

        promiseAll(values.map(function (val) {
          return runInLogic(val);
        })).then(function () {
          _this.onQueryFinished();
        }).catch(function (err) {
          _this.onErrorOccured(err);
        });
      };

      In.prototype.executeSimpleForIn_ = function (column, values) {
        var _this = this;

        var cursorRequest;
        var columnStore = this.objectStore.index(column);

        var runInLogic = function (value) {
          return promise(function (res, rej) {
            cursorRequest = columnStore.openCursor(_this.getKeyRange(value));

            cursorRequest.onsuccess = function (e) {
              in_cursor = e.target.result;

              if (in_cursor) {
                if (shouldAddValue()) {
                  _this.pushResult(in_cursor.value);
                }

                in_cursor.continue();
              } else {
                res();
              }
            };

            cursorRequest.onerror = rej;
          });
        };

        promiseAll(values.map(function (val) {
          return runInLogic(val);
        })).then(function () {
          _this.onQueryFinished();
        }).catch(function (err) {
          _this.onErrorOccured(err);
        });
      };

      return In;
    }(not_where_NotWhere); // CONCATENATED MODULE: ./src/worker/business/select/regex.ts


    var regex_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var regex_shouldAddValue;
    var regex_skipOrPush;
    var regex_skip;
    var regex_cursor;
    var regex_cursorRequest;

    var regex_Regex =
    /** @class */
    function (_super) {
      regex_extends(Regex, _super);

      function Regex() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Regex.prototype.executeRegexLogic = function (column, exp) {
        var _this = this;

        regex_skip = this.skipRecord;
        this.regexExpression = exp;

        regex_skipOrPush = function (val) {
          if (regex_skip === 0) {
            _this.pushResult(val);
          } else {
            --regex_skip;
          }
        };

        regex_shouldAddValue = function () {
          return _this.regexTest(regex_cursor.key) && _this.whereCheckerInstance.check(regex_cursor.value);
        };

        regex_cursorRequest = this.objectStore.index(column).openCursor();
        regex_cursorRequest.onerror = this.onErrorOccured;

        if (this.shouldEvaluateLimitAtEnd === false && this.shouldEvaluateSkipAtEnd === false) {
          if (this.skipRecord && this.limitRecord) {
            this.executeSkipAndLimitForRegex_();
          } else if (this.skipRecord) {
            this.executeSkipForRegex_();
          } else if (this.limitRecord) {
            this.executeLimitForRegex_();
          } else {
            this.executeSimpleForRegex_();
          }
        } else {
          this.executeSimpleForRegex_();
        }
      };

      Regex.prototype.executeSkipAndLimitForRegex_ = function () {
        var _this = this;

        regex_cursorRequest.onsuccess = function (e) {
          regex_cursor = e.target.result;

          if (_this.results.length !== _this.limitRecord && regex_cursor) {
            if (regex_shouldAddValue()) {
              regex_skipOrPush(regex_cursor.value);
            }

            regex_cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      Regex.prototype.executeSkipForRegex_ = function () {
        var _this = this;

        regex_cursorRequest.onsuccess = function (e) {
          regex_cursor = e.target.result;

          if (regex_cursor) {
            if (regex_shouldAddValue()) {
              regex_skipOrPush(regex_cursor.value);
            }

            regex_cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      Regex.prototype.executeLimitForRegex_ = function () {
        var _this = this;

        regex_cursorRequest.onsuccess = function (e) {
          regex_cursor = e.target.result;

          if (_this.results.length !== _this.limitRecord && regex_cursor) {
            if (regex_shouldAddValue()) {
              _this.pushResult(regex_cursor.value);
            }

            regex_cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      Regex.prototype.executeSimpleForRegex_ = function () {
        var _this = this;

        regex_cursorRequest.onsuccess = function (e) {
          regex_cursor = e.target.result;

          if (regex_cursor) {
            if (regex_shouldAddValue()) {
              _this.pushResult(regex_cursor.value);
            }

            regex_cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      return Regex;
    }(in_In); // CONCATENATED MODULE: ./src/worker/business/select/where.ts


    var where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var where_shouldAddValue;
    var where_cursor;
    var where_cursorRequest;

    var where_Where =
    /** @class */
    function (_super) {
      where_extends(Where, _super);

      function Where() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Where.prototype.executeWhereLogic = function (column, value, op, dir) {
        var _this = this;

        where_shouldAddValue = function () {
          return _this.whereCheckerInstance.check(where_cursor.value);
        };

        value = op ? value[op] : value;
        where_cursorRequest = this.objectStore.index(column).openCursor(this.getKeyRange(value, op), dir);
        where_cursorRequest.onerror = this.onErrorOccured;

        if (this.shouldEvaluateLimitAtEnd === false && this.shouldEvaluateSkipAtEnd === false) {
          if (this.skipRecord && this.limitRecord) {
            this.executeSkipAndLimitForWhere_();
          } else if (this.skipRecord) {
            this.executeSkipForWhere_();
          } else if (this.limitRecord) {
            this.executeLimitForWhere_();
          } else {
            this.executeSimpleForWhere_();
          }
        } else {
          this.executeSimpleForWhere_();
        }
      };

      Where.prototype.executeSkipAndLimitForWhere_ = function () {
        var _this = this;

        var recordSkipped = false;

        where_cursorRequest.onsuccess = function (e) {
          where_cursor = e.target.result;

          if (where_cursor) {
            if (recordSkipped && _this.results.length !== _this.limitRecord) {
              if (where_shouldAddValue()) {
                _this.pushResult(where_cursor.value);
              }

              where_cursor.continue();
            } else {
              recordSkipped = true;
              where_cursor.advance(_this.skipRecord);
            }
          } else {
            _this.onQueryFinished();
          }
        };
      };

      Where.prototype.executeSkipForWhere_ = function () {
        var _this = this;

        var recordSkipped = false;

        where_cursorRequest.onsuccess = function (e) {
          where_cursor = e.target.result;

          if (where_cursor) {
            if (recordSkipped) {
              if (where_shouldAddValue()) {
                _this.pushResult(where_cursor.value);
              }

              where_cursor.continue();
            } else {
              recordSkipped = true;
              where_cursor.advance(_this.skipRecord);
            }
          } else {
            _this.onQueryFinished();
          }
        };
      };

      Where.prototype.executeLimitForWhere_ = function () {
        var _this = this;

        where_cursorRequest.onsuccess = function (e) {
          where_cursor = e.target.result;

          if (where_cursor && _this.results.length !== _this.limitRecord) {
            if (where_shouldAddValue()) {
              _this.pushResult(where_cursor.value);
            }

            where_cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      Where.prototype.executeSimpleForWhere_ = function () {
        var _this = this;

        where_cursorRequest.onsuccess = function (e) {
          where_cursor = e.target.result;

          if (where_cursor) {
            if (where_shouldAddValue()) {
              _this.pushResult(where_cursor.value);
            }

            where_cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };
      };

      return Where;
    }(regex_Regex); // CONCATENATED MODULE: ./src/worker/business/select/group_by_helper.ts


    var group_by_helper_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var group_by_helper_GroupByHelper =
    /** @class */
    function (_super) {
      group_by_helper_extends(GroupByHelper, _super);

      function GroupByHelper() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      GroupByHelper.prototype.processGroupBy = function () {
        var groupBy = this.query.groupBy;
        var datas = this.results;
        var lookUpObj = {}; // free results memory

        this.results = this.query.groupBy = null;

        if (getDataType(groupBy) !== DATA_TYPE.Object) {
          if (getDataType(groupBy) === DATA_TYPE.String) {
            for (var i in datas) {
              lookUpObj[datas[i][groupBy]] = datas[i];
            }
          } else {
            var objKey = void 0;

            for (var i in datas) {
              objKey = "";

              for (var column in groupBy) {
                objKey += datas[i][groupBy[column]];
              }

              lookUpObj[objKey] = datas[i];
            }
          }
        } else {
          var caseQueryLength = Object.keys(groupBy).length;

          if (caseQueryLength === 1) {
            var groupByColumn = getObjectFirstKey(groupBy);
            this.thenEvaluator.setCaseAndColumn(groupBy, groupByColumn);

            for (var i in datas) {
              lookUpObj[this.thenEvaluator.setValue(datas[i]).evaluate()] = datas[i];
            }
          } else {
            var objKey = void 0;

            for (var i in datas) {
              objKey = "";
              this.thenEvaluator.setCaseAndValue(groupBy, datas[i]);

              for (var column in groupBy) {
                objKey += this.thenEvaluator.setColumn(column).evaluate();
              }

              lookUpObj[objKey] = datas[i];
            }
          }
        } // free datas memory


        datas = [];

        for (var i in lookUpObj) {
          datas.push(lookUpObj[i]);
        }

        this.results = datas;
      };

      GroupByHelper.prototype.executeAggregateGroupBy = function () {
        var grpQry = this.query.groupBy;
        var datas = this.results; // free results memory

        this.results = undefined;
        var lookUpObj = {}; // assign aggregate

        var aggregateQry = this.query.aggregate;
        var objKey;
        var value;
        var columnToAggregate;

        var calculateAggregate = function () {
          var getCount = function () {
            value = lookUpObj[objKey]; // get old value

            value = value ? value["count(" + columnToAggregate + ")"] : 0; // add with old value if data exist

            value += datas[index][columnToAggregate] ? 1 : 0;
            return value;
          };

          var getMax = function () {
            value = lookUpObj[objKey]; // get old value

            value = value ? value["max(" + columnToAggregate + ")"] : 0;
            datas[index][columnToAggregate] = datas[index][columnToAggregate] ? datas[index][columnToAggregate] : 0; // compare between old value and new value

            return value > datas[index][columnToAggregate] ? value : datas[index][columnToAggregate];
          };

          var getMin = function () {
            value = lookUpObj[objKey]; // get old value

            value = value ? value["min(" + columnToAggregate + ")"] : Infinity;
            datas[index][columnToAggregate] = datas[index][columnToAggregate] ? datas[index][columnToAggregate] : Infinity; // compare between old value and new value

            return value < datas[index][columnToAggregate] ? value : datas[index][columnToAggregate];
          };

          var getSum = function () {
            value = lookUpObj[objKey]; // get old value

            value = value ? value["sum(" + columnToAggregate + ")"] : 0; // add with old value if data exist

            value += datas[index][columnToAggregate] ? datas[index][columnToAggregate] : 0;
            return value;
          };

          var getAvg = function () {
            value = lookUpObj[objKey]; // get old sum value

            var sumOfColumn = value ? value["sum(" + columnToAggregate + ")"] : 0; // add with old value if data exist

            sumOfColumn += datas[index][columnToAggregate] ? datas[index][columnToAggregate] : 0;
            datas[index]["sum(" + columnToAggregate + ")"] = sumOfColumn; // get old count value

            value = value ? value["count(" + columnToAggregate + ")"] : 0; // add with old value if data exist

            value += datas[index][columnToAggregate] ? 1 : 0;
            datas[index]["count(" + columnToAggregate + ")"] = value;
          };

          for (var prop in aggregateQry) {
            var aggregateColumn = aggregateQry[prop];
            var aggregateValType = getDataType(aggregateColumn);
            var aggregateCalculator = void 0;

            switch (prop) {
              case QUERY_OPTION.Count:
                aggregateCalculator = getCount;
                break;

              case QUERY_OPTION.Max:
                aggregateCalculator = getMax;
                break;

              case QUERY_OPTION.Min:
                aggregateCalculator = getMin;
                break;

              case QUERY_OPTION.Sum:
                aggregateCalculator = getSum;
                break;

              case QUERY_OPTION.Avg:
                aggregateCalculator = getAvg;
                break;
            }

            switch (aggregateValType) {
              case DATA_TYPE.String:
                columnToAggregate = aggregateColumn;
                datas[index][prop + "(" + columnToAggregate + ")"] = aggregateCalculator();
                break;

              case DATA_TYPE.Array:
                for (var item in aggregateColumn) {
                  columnToAggregate = aggregateColumn[item];
                  datas[index][prop + "(" + columnToAggregate + ")"] = aggregateCalculator();
                }

            }
          }
        };

        if (getDataType(grpQry) === DATA_TYPE.String) {
          for (var index in datas) {
            objKey = datas[index][grpQry];
            calculateAggregate();
            lookUpObj[objKey] = datas[index];
          }
        } else {
          for (index in datas) {
            objKey = "";

            for (var column in grpQry) {
              objKey += datas[index][grpQry[column]];
            }

            calculateAggregate();
            lookUpObj[objKey] = datas[index];
          }
        } // free datas memory


        datas = [];

        for (var i in lookUpObj) {
          datas.push(lookUpObj[i]);
        } // Checking for avg and if exist then fill the datas;


        if (aggregateQry.avg) {
          if (getDataType(aggregateQry.avg) === DATA_TYPE.String) {
            for (index in datas) {
              var sumForAvg = datas[index]["sum(" + aggregateQry.avg + ")"],
                  countForAvg = datas[index]["count(" + aggregateQry.avg + ")"];
              datas[index]["avg(" + aggregateQry.avg + ")"] = sumForAvg / countForAvg;

              if (aggregateQry.count !== aggregateQry.avg) {
                delete datas[index]["count(" + aggregateQry.avg + ")"];
              }

              if (aggregateQry.sum !== aggregateQry.avg) {
                delete datas[index]["sum(" + aggregateQry.avg + ")"];
              }
            }
          } else {
            var isCountTypeString = getDataType(aggregateQry.count) === DATA_TYPE.String;
            var isSumTypeString = getDataType(aggregateQry.sum) === DATA_TYPE.String;

            for (index in datas) {
              for (var column in aggregateQry.avg) {
                var avgColumn = aggregateQry.avg[column],
                    sum = datas[index]["sum(" + avgColumn + ")"],
                    count = datas[index]["count(" + avgColumn + ")"];
                datas[index]["avg(" + avgColumn + ")"] = sum / count;

                if (isCountTypeString) {
                  if (aggregateQry.count !== avgColumn) {
                    delete datas[index]["count(" + avgColumn + ")"];
                  } else if (aggregateQry.count.indexOf(avgColumn) === -1) {
                    delete datas[index]["count(" + avgColumn + ")"];
                  }
                }

                if (isSumTypeString) {
                  if (aggregateQry.sum !== avgColumn) {
                    delete datas[index]["sum(" + avgColumn + ")"];
                  } else if (aggregateQry.sum.indexOf(avgColumn) === -1) {
                    delete datas[index]["sum(" + avgColumn + ")"];
                  }
                }
              }
            }
          }
        }

        this.results = datas;
      };

      return GroupByHelper;
    }(where_Where); // CONCATENATED MODULE: ./src/worker/utils/remove_space.ts


    var removeSpace = function (value) {
      return value.replace(/\s/g, '');
    }; // CONCATENATED MODULE: ./src/worker/business/select/orderby_helper.ts


    var orderby_helper_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var orderby_helper_Helper =
    /** @class */
    function (_super) {
      orderby_helper_extends(Helper, _super);

      function Helper() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Helper.prototype.processGroupDistinctAggr = function () {
        if (this.query.distinct) {
          var groupBy = [];
          var result = this.results[0];

          for (var key in result) {
            groupBy.push(key);
          }

          var primaryKey = this.getPrimaryKey(this.query.from),
              index = groupBy.indexOf(primaryKey);
          groupBy.splice(index, 1);
          this.query.groupBy = groupBy.length > 0 ? groupBy : null;
        }

        if (this.query.groupBy) {
          if (this.query.aggregate) {
            this.executeAggregateGroupBy();
          } else {
            this.processGroupBy();
          }
        } else if (this.query.aggregate) {
          this.processAggregateQry();
        }
      };

      Helper.prototype.getOrderColumnInfo_ = function (orderColumn) {
        var column;

        if (this.query.join == null) {
          column = this.getColumnInfo(orderColumn, this.query.from);
        } else {
          var splittedByDot = removeSpace(orderColumn).split(".");
          orderColumn = splittedByDot[1];
          column = this.getColumnInfo(orderColumn, splittedByDot[0]);
        }

        if (column == null) {
          var valueFromFirstColumn = this.results[0][orderColumn];

          if (valueFromFirstColumn) {
            return {
              dataType: getDataType(valueFromFirstColumn),
              name: orderColumn
            };
          }

          this.onErrorOccured(new log_helper_LogHelper(ERROR_TYPE.ColumnNotExist, {
            column: orderColumn,
            isOrder: true
          }), true);
        }

        return column;
      };

      Helper.prototype.compareStringInDesc_ = function (a, b) {
        return b.localeCompare(a);
      };

      Helper.prototype.compareStringinAsc_ = function (a, b) {
        return a.localeCompare(b);
      };

      Helper.prototype.compareDefaultInDesc_ = function (a, b) {
        return new String(b).localeCompare(a);
      };

      Helper.prototype.compareDefaultinAsc_ = function (a, b) {
        return new String(a).localeCompare(b);
      };

      Helper.prototype.compareNumberInDesc_ = function (a, b) {
        return b - a;
      };

      Helper.prototype.compareNumberinAsc_ = function (a, b) {
        return a - b;
      };

      Helper.prototype.compareDateInDesc_ = function (a, b) {
        return b.getTime() - a.getTime();
      };

      Helper.prototype.compareDateInAsc_ = function (a, b) {
        return a.getTime() - b.getTime();
      };

      Helper.prototype.getValInDesc_ = function (value1, value2, caseQuery) {
        for (var columnName in caseQuery) {
          this.thenEvaluator.setCaseAndValue(caseQuery, value1);
          var column1 = this.thenEvaluator.setColumn(columnName).evaluate();
          this.thenEvaluator.setCaseAndValue(caseQuery, value2);
          var column2 = this.thenEvaluator.setColumn(columnName).evaluate();

          switch (typeof value1[column1]) {
            case DATA_TYPE.String:
              return this.compareStringInDesc_(value1[column1], value2[column2]);

            default:
              return this.compareNumberInDesc_(value1[column1], value2[column2]);
          }
        }
      };

      Helper.prototype.getValInAsc_ = function (value1, value2, caseQuery) {
        for (var columnName in caseQuery) {
          this.thenEvaluator.setCaseAndValue(caseQuery, value1);
          var column1 = this.thenEvaluator.setColumn(columnName).evaluate();
          this.thenEvaluator.setCaseAndValue(caseQuery, value2);
          var column2 = this.thenEvaluator.setColumn(columnName).evaluate();

          switch (typeof value1[column1]) {
            case DATA_TYPE.String:
              return this.compareStringinAsc_(value1[column1], value2[column2]);

            default:
              return this.compareNumberinAsc_(value1[column1], value2[column2]);
          }
        }
      };

      Helper.prototype.getValueComparer_ = function (column, order) {
        switch (column.dataType) {
          case DATA_TYPE.String:
            return order.type === 'asc' ? this.compareStringinAsc_ : this.compareStringInDesc_;

          case DATA_TYPE.Number:
            return order.type === 'asc' ? this.compareNumberinAsc_ : this.compareNumberInDesc_;

          case DATA_TYPE.DateTime:
            return order.type === 'asc' ? this.compareDateInAsc_ : this.compareDateInDesc_;

          default:
            return order.type === 'asc' ? this.compareDefaultinAsc_ : this.compareDefaultInDesc_;
        }
      };

      Helper.prototype.orderBy_ = function (order) {
        var _a;

        var _this = this;

        order.type = this.getOrderType_(order.type);
        var orderColumn = order.by;

        if (orderColumn != null && typeof orderColumn === DATA_TYPE.Object) {
          if (order.type === "asc") {
            this.results.sort(function (a, b) {
              return _this.getValInAsc_(a, b, orderColumn);
            });
          } else {
            this.results.sort(function (a, b) {
              return _this.getValInDesc_(a, b, orderColumn);
            });
          }
        } else {
          var columnInfo = this.getOrderColumnInfo_(orderColumn);

          if (columnInfo != null) {
            var orderMethod_1 = this.getValueComparer_(columnInfo, order);
            orderColumn = columnInfo.name;

            if (order.case == null) {
              this.results.sort(function (a, b) {
                return orderMethod_1(a[orderColumn], b[orderColumn]);
              });
            } else {
              this.thenEvaluator.setCaseAndColumn((_a = {}, _a[orderColumn] = order.case, _a), orderColumn);
              this.results.sort(function (a, b) {
                return orderMethod_1(_this.thenEvaluator.setValue(a).evaluate(), _this.thenEvaluator.setValue(b).evaluate());
              });
            }
          }
        }
      };

      Helper.prototype.getOrderType_ = function (type) {
        return type == null ? 'asc' : type.toLowerCase();
      };

      Helper.prototype.processOrderBy = function () {
        var order = this.query.order;

        if (order && this.results.length > 0 && !this.sorted) {
          var orderQueryType = getDataType(order);

          if (orderQueryType === DATA_TYPE.Object) {
            this.orderBy_(order);
          } else if (orderQueryType === DATA_TYPE.Array) {
            this.orderBy_(order[0]);

            var _loop_1 = function (i) {
              if (this_1.error == null) {
                var prevOrderQueryBy_1 = order[i - 1].by;
                var currentOrderQuery = order[i];
                var currentorderQueryBy_1 = currentOrderQuery.by;
                var orderColumnDetail = this_1.getOrderColumnInfo_(currentorderQueryBy_1);

                if (orderColumnDetail != null) {
                  currentorderQueryBy_1 = orderColumnDetail.name;
                  currentOrderQuery.type = this_1.getOrderType_(currentOrderQuery.type);
                  var orderMethod_2 = this_1.getValueComparer_(orderColumnDetail, currentOrderQuery);
                  this_1.results.sort(function (a, b) {
                    if (a[prevOrderQueryBy_1] === b[prevOrderQueryBy_1]) {
                      return orderMethod_2(a[currentorderQueryBy_1], b[currentorderQueryBy_1]);
                    }

                    return 0;
                  });
                }
              }
            };

            var this_1 = this;

            for (var i = 1, length_1 = order.length; i < length_1; i++) {
              _loop_1(i, length_1);
            }
          }
        }
      };

      Helper.prototype.processAggregateQry = function () {
        var datas = this.results;
        var datasLength = datas.length;
        var results = {};
        var columnToAggregate; // free results memory

        this.results = undefined;

        var getCount = function () {
          var result = 0;

          for (var i in datas) {
            result += datas[i][columnToAggregate] ? 1 : 0;
          }

          return result;
        };

        var getMax = function () {
          var result = 0;

          for (var i in datas) {
            result = result > datas[i][columnToAggregate] ? result : datas[i][columnToAggregate];
          }

          return result;
        };

        var getMin = function () {
          var result = Infinity,
              value = Infinity;

          for (var i in datas) {
            value = datas[i][columnToAggregate] ? datas[i][columnToAggregate] : Infinity;
            result = result < value ? result : value;
          }

          return result;
        };

        var getSum = function () {
          var result = 0;

          for (var i in datas) {
            result += datas[i][columnToAggregate];
          }

          return result;
        };

        var getAvg = function () {
          var result = 0;

          for (var i in datas) {
            result += datas[i][columnToAggregate];
          }

          return result / datasLength;
        };

        for (var prop in this.query.aggregate) {
          var aggregateColumn = this.query.aggregate[prop];
          var aggregateValType = getDataType(aggregateColumn);
          var aggregateCalculator = void 0;

          switch (prop) {
            case 'count':
              aggregateCalculator = getCount;
              break;

            case 'max':
              aggregateCalculator = getMax;
              break;

            case 'min':
              aggregateCalculator = getMin;
              break;

            case 'sum':
              aggregateCalculator = getSum;
              break;

            case 'avg':
              aggregateCalculator = getAvg;
              break;
          }

          switch (aggregateValType) {
            case DATA_TYPE.String:
              columnToAggregate = aggregateColumn;
              results[prop + "(" + columnToAggregate + ")"] = aggregateCalculator();
              break;

            case DATA_TYPE.Array:
              for (var key in aggregateColumn) {
                columnToAggregate = aggregateColumn[key];
                results[prop + "(" + columnToAggregate + ")"] = aggregateCalculator();
              }

          }
        } // add results to the first index of result


        for (var prop in results) {
          datas[0][prop] = results[prop];
        }

        this.results = [datas[0]];
      };

      return Helper;
    }(group_by_helper_GroupByHelper); // CONCATENATED MODULE: ./src/worker/business/select/join.ts


    var join_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var __assign = undefined && undefined.__assign || function () {
      __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];

          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }

        return t;
      };

      return __assign.apply(this, arguments);
    };

    var join_Join =
    /** @class */
    function (_super) {
      join_extends(Join, _super);

      function Join() {
        var _this = _super !== null && _super.apply(this, arguments) || this;

        _this.joinQueryStack_ = [];
        _this.currentQueryStackIndex_ = 0;
        _this.tablesFetched = [];
        return _this;
      }

      Join.prototype.executeJoinQuery = function () {
        var _this = this;

        var query = this.query;

        if (getDataType(query.join) === DATA_TYPE.Object) {
          this.joinQueryStack_ = [query.join];
        } else {
          this.joinQueryStack_ = query.join;
        } // get the data for first table


        var tableName = query.from;
        new instance_Instance({
          from: tableName,
          where: query.where,
          case: query.case,
          flatten: query.flatten
        }, function (results) {
          _this.results = results.map(function (item) {
            var _a;

            return _a = {}, _a[_this.currentQueryStackIndex_] = item, _a;
          });

          _this.tablesFetched.push(tableName);

          _this.startExecutingJoinLogic_();
        }, this.onError).execute();
      };

      Join.prototype.onJoinQueryFinished_ = function () {
        var _this = this;

        if (this.error == null) {
          if (this.results.length > 0) {
            if (this.query[QUERY_OPTION.Skip] && !this.query[QUERY_OPTION.Limit]) {
              this.results.splice(0, this.query[QUERY_OPTION.Skip]);
            }

            try {
              var results_1 = [];
              var tables = Object.keys(this.results[0]);
              var tablesLength_1 = tables.length;

              var mapWithAlias_1 = function (query, value) {
                if (query.as != null) {
                  for (var key in query.as) {
                    if (value[query.as[key]] === undefined) {
                      value[query.as[key]] = value[key];
                      delete value[key];
                    }
                  }
                }

                return value;
              };

              this.results.forEach(function (result) {
                var data = result["0"]; // first table data

                for (var i = 1; i < tablesLength_1; i++) {
                  var query = _this.joinQueryStack_[i - 1];
                  data = __assign(__assign({}, data), mapWithAlias_1(query, result[i]));
                }

                results_1.push(data);
              });
              this.results = results_1; // free results memory

              results_1 = null;

              try {
                this.processOrderBy();
              } catch (ex) {
                this.onError({
                  message: ex.message,
                  type: ERROR_TYPE.InvalidOrderQuery
                });
                return;
              }

              try {
                this.processGroupDistinctAggr();
              } catch (ex) {
                this.onError({
                  message: ex.message,
                  type: ERROR_TYPE.InvalidGroupQuery
                });
                return;
              }
            } catch (ex) {
              this.onError({
                message: ex.message,
                type: ERROR_TYPE.InvalidJoinQuery
              });
              return;
            }

            if (this.query[QUERY_OPTION.Skip] && this.query[QUERY_OPTION.Limit]) {
              this.results.splice(0, this.query[QUERY_OPTION.Skip]);
              this.results = this.results.slice(0, this.query[QUERY_OPTION.Limit]);
            } else if (this.query[QUERY_OPTION.Limit]) {
              this.results = this.results.slice(0, this.query[QUERY_OPTION.Limit]);
            }
          }

          this.onSuccess(this.results);
        } else {
          this.onError(this.error);
        }
      };

      Join.prototype.startExecutingJoinLogic_ = function () {
        var _this = this;

        var query = this.joinQueryStack_[this.currentQueryStackIndex_];

        if (query) {
          try {
            var jointblInfo_1 = this.getJoinTableInfo_(query.on); // table 1 is fetched & table2 needs to be fetched for join

            if (query.with === jointblInfo_1.table1.table) {
              jointblInfo_1 = {
                table1: jointblInfo_1.table2,
                table2: jointblInfo_1.table1
              };
            }

            this.checkJoinQuery_(jointblInfo_1, query);

            if (this.error != null) {
              return this.onJoinQueryFinished_();
            }

            new instance_Instance({
              from: query.with,
              where: query.where,
              case: query.case,
              flatten: query.flatten
            }, function (results) {
              _this.jointables(query.type, jointblInfo_1, results);

              _this.tablesFetched.push(jointblInfo_1.table2.table);

              ++_this.currentQueryStackIndex_;

              _this.startExecutingJoinLogic_();
            }, this.onError).execute();
          } catch (ex) {
            this.onExceptionOccured(ex);
          }
        } else {
          this.onJoinQueryFinished_();
        }
      };

      Join.prototype.jointables = function (joinType, jointblInfo, secondtableData) {
        var _this = this;

        var results = [];
        var column1 = jointblInfo.table1.column;
        var column2 = jointblInfo.table2.column;
        var table1Index = this.tablesFetched.indexOf(jointblInfo.table1.table);
        var table2Index = this.currentQueryStackIndex_ + 1;

        var performInnerJoin = function () {
          var index = 0;

          _this.results.forEach(function (valueFromFirstTable) {
            secondtableData.forEach(function (valueFromSecondTable) {
              if (valueFromFirstTable[table1Index][column1] === valueFromSecondTable[column2]) {
                results[index] = __assign({}, valueFromFirstTable);
                results[index++][table2Index] = valueFromSecondTable;
              }
            });
          });
        };

        var performleftJoin = function () {
          var index = 0;
          var valueMatchedFromSecondTable;
          var callBack;
          var columnDefaultValue = {};

          _this.getTable(jointblInfo.table2.table).columns.forEach(function (col) {
            columnDefaultValue[col.name] = null;
          });

          _this.results.forEach(function (valueFromFirstTable) {
            valueMatchedFromSecondTable = [];

            if (table2Index === 1) {
              callBack = function (valueFromSecondTable) {
                if (valueFromFirstTable[table1Index][column1] === valueFromSecondTable[column2]) {
                  valueMatchedFromSecondTable.push(valueFromSecondTable);
                }
              };
            } else {
              callBack = function (valueFromSecondTable) {
                var value = valueFromFirstTable[table1Index];

                if (value != null && value[column1] === valueFromSecondTable[column2]) {
                  valueMatchedFromSecondTable.push(valueFromSecondTable);
                }
              };
            }

            secondtableData.forEach(callBack);

            if (valueMatchedFromSecondTable.length === 0) {
              valueMatchedFromSecondTable = [columnDefaultValue];
            }

            valueMatchedFromSecondTable.forEach(function (value) {
              results[index] = __assign({}, valueFromFirstTable);
              results[index++][table2Index] = value;
            });
          });
        };

        switch (joinType) {
          case "left":
            performleftJoin();
            break;

          default:
            performInnerJoin();
        }

        this.results = results;
      };

      Join.prototype.getJoinTableInfo_ = function (joinOn) {
        joinOn = removeSpace(joinOn);
        var splittedjoinOn = joinOn.split("=");
        var splittedjoinOnbydotFirst = splittedjoinOn[0].split(".");
        var splittedjoinOnbydotSecond = splittedjoinOn[1].split(".");
        var info = {
          table1: {
            table: splittedjoinOnbydotFirst[0],
            column: splittedjoinOnbydotFirst[1]
          },
          table2: {
            table: splittedjoinOnbydotSecond[0],
            column: splittedjoinOnbydotSecond[1]
          }
        };
        return info;
      };

      Join.prototype.checkJoinQuery_ = function (jointblInfo, qry) {
        var table1 = jointblInfo.table1;
        var table2 = jointblInfo.table2;
        var tableSchemaOf1stTable = this.getTable(table1.table);
        var tableSchemaOf2ndTable = this.getTable(table2.table);
        var err; // check on info & with info 

        if (qry.with !== table2.table) {
          err = new log_helper_LogHelper(ERROR_TYPE.InvalidJoinQuery, "on value should contains value of with");
        } // check for column existance


        if (tableSchemaOf1stTable.columns.find(function (q) {
          return q.name === table1.column;
        }) == null) {
          err = new log_helper_LogHelper(ERROR_TYPE.InvalidJoinQuery, "column " + table1.column + " does not exist in table " + table1.table);
        } else if (tableSchemaOf2ndTable.columns.find(function (q) {
          return q.name === table2.column;
        }) == null) {
          err = new log_helper_LogHelper(ERROR_TYPE.InvalidJoinQuery, "column " + table2.column + " does not exist in table " + table2.table);
        } // check for column match in both table


        if (qry.as == null) {
          qry.as = {};
        }

        tableSchemaOf1stTable.columns.every(function (column) {
          var columnFound = tableSchemaOf2ndTable.columns.find(function (q) {
            return q.name === column.name && q.name !== table1.column;
          });

          if (columnFound != null && qry.as[columnFound.name] == null) {
            err = new log_helper_LogHelper(ERROR_TYPE.InvalidJoinQuery, "column " + column.name + " exist in both table " + table1.table + " & " + table2.table);
            return false;
          }

          return true;
        });

        if (err != null) {
          this.onErrorOccured(err, true);
        }
      };

      return Join;
    }(orderby_helper_Helper); // CONCATENATED MODULE: ./src/worker/utils/is_array.ts


    var isArray = function (value) {
      return Array.isArray(value);
    }; // CONCATENATED MODULE: ./src/worker/utils/is_object.ts


    var is_object_isObject = function (value) {
      return typeof value === 'object';
    }; // CONCATENATED MODULE: ./src/worker/business/select/instance.ts


    var instance_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var instance_assign = undefined && undefined.__assign || function () {
      instance_assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];

          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }

        return t;
      };

      return instance_assign.apply(this, arguments);
    };

    var __spreadArrays = undefined && undefined.__spreadArrays || function () {
      for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;

      for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];

      return r;
    };

    var instance_Instance =
    /** @class */
    function (_super) {
      instance_extends(Instance, _super);

      function Instance(query, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onTransactionCompleted_ = function () {
          if (_this.error == null) {
            if (_this.query.flatten) {
              var flattendData_1 = [];
              var indexToDelete_1 = {};

              _this.query.flatten.forEach(function (column) {
                _this.results.forEach(function (data, i) {
                  data[column].forEach(function (item) {
                    var _a;

                    flattendData_1.push(instance_assign(instance_assign({}, data), (_a = {}, _a[column] = item, _a)));
                  });
                  indexToDelete_1[i] = true;
                });
              });

              var itemsDeleted_1 = 0;
              getKeys(indexToDelete_1).forEach(function (key) {
                _this.results.splice(Number(key) - itemsDeleted_1, 1);

                ++itemsDeleted_1;
              });
              _this.results = _this.results.concat(flattendData_1);
            }

            _this.processGroupDistinctAggr();

            _this.processOrderBy();

            if (!_this.error) {
              if (_this.shouldEvaluateSkipAtEnd) {
                _this.results.splice(0, _this.query.skip);
              }

              if (_this.shouldEvaluateLimitAtEnd) {
                _this.results = _this.results.slice(0, _this.query.limit);
              }

              _this.onSuccess(_this.results);
            } else {
              _this.onError(_this.error);
            }
          } else {
            _this.onError(_this.error);
          }
        };

        _this.onError = onError;
        _this.onSuccess = onSuccess;
        _this.query = query;
        _this.tableName = query.from;

        _this.setPushResult();

        if (isArray(_this.query.where)) {
          _this.isArrayQry = true;

          _this.setLimitAndSkipEvaluationAtEnd_();
        } else {
          _this.skipRecord = query.skip;
          _this.limitRecord = query.limit;
        }

        if (query.order) {
          if (isArray(query.order) || query.order.case || is_object_isObject(query.order.by)) {
            _this.query.order.idbSorting = false;
          }

          _this.setLimitAndSkipEvaluationAtEnd_();
        } else if (query.groupBy) {
          _this.setLimitAndSkipEvaluationAtEnd_();
        }

        return _this;
      }

      Instance.prototype.setLimitAndSkipEvaluationAtEnd_ = function () {
        if (this.query.limit) {
          this.shouldEvaluateLimitAtEnd = true;
        }

        if (this.query.skip) {
          this.shouldEvaluateSkipAtEnd = true;
        }
      };

      Instance.prototype.execute = function () {
        var queryHelper = new query_helper_QueryHelper(API.Select, this.query);
        queryHelper.checkAndModify();

        if (queryHelper.error == null) {
          try {
            if (this.query.join == null) {
              if (this.query.where != null) {
                this.initTransaction_();

                if (isArray(this.query.where)) {
                  this.processWhereArrayQry();
                } else {
                  this.processWhere_();
                }
              } else {
                this.initTransaction_();
                this.executeWhereUndefinedLogic();
              }
            } else {
              this.executeJoinQuery();
            }
          } catch (ex) {
            this.onExceptionOccured(ex);
          }
        } else {
          this.onError(queryHelper.error);
        }
      };

      Instance.prototype.processWhereArrayQry = function () {
        var _this = this;

        this.isArrayQry = true;
        var whereQuery = this.query.where,
            pKey = this.getPrimaryKey(this.query.from);
        var isFirstWhere = true,
            output = [],
            operation;

        var isItemExist = function (keyValue) {
          return output.findIndex(function (item) {
            return item[pKey] === keyValue;
          }) >= 0;
        };

        var onSuccess = function () {
          if (operation === QUERY_OPTION.And) {
            var doAnd = function () {
              var andResults = [];

              _this.results.forEach(function (item) {
                if (isItemExist(item[pKey])) {
                  andResults.push(item);
                }
              });

              output = andResults;
              andResults = null;
            };

            if (isFirstWhere === true) {
              output = _this.results;
            } else if (output.length > 0) {
              doAnd();
            }
          } else {
            if (output.length > 0) {
              _this.results = __spreadArrays(output, _this.results);

              _this.removeDuplicates();

              output = _this.results;
            } else {
              output = _this.results;
            }
          }

          isFirstWhere = false;

          if (whereQuery.length > 0) {
            _this.results = [];
            processFirstQry();
          } else {
            _this.results = output;

            if (_this.isSubQuery === true) {
              _this.onTransactionCompleted_();
            }
          }
        };

        var processFirstQry = function () {
          _this.query.where = whereQuery.shift();

          if (_this.query.where[QUERY_OPTION.Or]) {
            if (Object.keys(_this.query.where).length === 1) {
              operation = QUERY_OPTION.Or;
              _this.query.where = _this.query.where[QUERY_OPTION.Or];
              _this.onWhereArrayQrySuccess = onSuccess;
            } else {
              operation = QUERY_OPTION.And;
              _this.onWhereArrayQrySuccess = onSuccess;
            }
          } else {
            operation = QUERY_OPTION.And;
            _this.onWhereArrayQrySuccess = onSuccess;
          }

          _this.processWhere_();
        };

        processFirstQry();
      };

      Instance.prototype.onQueryFinished = function () {
        if (this.isOr === true) {
          this.orQuerySuccess_();
        } else if (this.isArrayQry === true) {
          this.onWhereArrayQrySuccess();
        } else if (this.isTransaction === true || this.isSubQuery === true) {
          this.onTransactionCompleted_();
        }
      };

      Instance.prototype.initTransaction_ = function () {
        this.createTransaction([this.tableName], this.onTransactionCompleted_, IDB_MODE.ReadOnly);
        this.objectStore = this.transaction.objectStore(this.tableName);
      };

      Instance.prototype.processWhere_ = function () {
        if (this.query.where.or) {
          this.processOrLogic_();
        }

        this.goToWhereLogic();
      };

      Instance.prototype.orQueryFinish_ = function () {
        this.isOr = false;
        this.results = this.orInfo.results; // free or info memory

        this.orInfo = null;
        this.removeDuplicates();
        this.onQueryFinished();
      };

      Instance.prototype.orQuerySuccess_ = function () {
        this.orInfo.results = __spreadArrays(this.orInfo.results, this.results);

        if (!this.query.limit || this.query.limit > this.orInfo.results.length) {
          this.results = [];
          var key = getObjectFirstKey(this.orInfo.orQuery);

          if (key != null) {
            var where = {};
            where[key] = this.orInfo.orQuery[key];
            delete this.orInfo.orQuery[key];
            this.query.where = where;
            this.goToWhereLogic();
          } else {
            this.orQueryFinish_();
          }
        } else {
          this.orQueryFinish_();
        }
      };

      Instance.prototype.processOrLogic_ = function () {
        this.isOr = true;
        this.orInfo = {
          orQuery: this.query.where.or,
          results: []
        }; // free or memory

        delete this.query.where.or;
      };

      return Instance;
    }(join_Join); // CONCATENATED MODULE: ./src/worker/business/count/base_count.ts


    var base_count_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var BaseCount =
    /** @class */
    function (_super) {
      base_count_extends(BaseCount, _super);

      function BaseCount() {
        var _this = _super !== null && _super.apply(this, arguments) || this;

        _this.resultCount = 0;

        _this.onTransactionCompleted_ = function () {
          if (_this.error == null) {
            _this.onSuccess(_this.resultCount);
          } else {
            _this.onError(_this.error);
          }
        };

        return _this;
      }

      BaseCount.prototype.onQueryFinished = function () {
        if (this.isTransaction === true) {
          this.onTransactionCompleted_();
        }
      };

      return BaseCount;
    }(WhereBase); // CONCATENATED MODULE: ./src/worker/business/count/not_where.ts


    var count_not_where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var count_not_where_NotWhere =
    /** @class */
    function (_super) {
      count_not_where_extends(NotWhere, _super);

      function NotWhere() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      NotWhere.prototype.executeWhereUndefinedLogic = function () {
        var _this = this;

        var countRequest;

        if (this.objectStore.count) {
          countRequest = this.objectStore.count();

          countRequest.onsuccess = function () {
            _this.resultCount = countRequest.result;

            _this.onQueryFinished();
          };
        } else {
          var cursor_1;
          countRequest = this.objectStore.openCursor();

          countRequest.onsuccess = function (e) {
            cursor_1 = e.target.result;

            if (cursor_1) {
              ++_this.resultCount;
              cursor_1.continue();
            } else {
              _this.onQueryFinished();
            }
          };
        }

        countRequest.onerror = this.onErrorOccured.bind(this);
      };

      return NotWhere;
    }(BaseCount); // CONCATENATED MODULE: ./src/worker/business/count/in.ts


    var count_in_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var count_in_In =
    /** @class */
    function (_super) {
      count_in_extends(In, _super);

      function In() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      In.prototype.executeInLogic = function (column, values) {
        var _this = this;

        var cursor, cursorRequest;
        var columnStore = this.objectStore.index(column);

        var runInLogic = function (value) {
          return promise(function (res, rej) {
            cursorRequest = columnStore.openCursor(_this.getKeyRange(value));

            cursorRequest.onsuccess = function (e) {
              cursor = e.target.result;

              if (cursor) {
                if (_this.whereCheckerInstance.check(cursor.value)) {
                  ++_this.resultCount;
                }

                cursor.continue();
              } else {
                res();
              }
            };

            cursorRequest.onerror = rej;
          });
        };

        if (this.objectStore.count) {
          runInLogic = function (value) {
            return promise(function (res, rej) {
              cursorRequest = columnStore.count(_this.getKeyRange(value));

              cursorRequest.onsuccess = function (e) {
                _this.resultCount += e.target.result;
                res();
              };

              cursorRequest.onerror = rej;
            });
          };
        }

        promiseAll(values.map(function (val) {
          return runInLogic(val);
        })).then(function () {
          _this.onQueryFinished();
        }).catch(function (err) {
          _this.onErrorOccured(err);
        });
      };

      return In;
    }(count_not_where_NotWhere); // CONCATENATED MODULE: ./src/worker/business/count/regex.ts


    var count_regex_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var count_regex_Regex =
    /** @class */
    function (_super) {
      count_regex_extends(Regex, _super);

      function Regex() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Regex.prototype.executeRegexLogic = function (column, exp) {
        var _this = this;

        var cursor;
        this.regexExpression = exp;
        var cursorRequest = this.objectStore.index(column).openCursor();

        cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            if (_this.regexTest(cursor.key) && _this.whereCheckerInstance.check(cursor.value)) {
              ++_this.resultCount;
            }

            cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };

        cursorRequest.onerror = this.onErrorOccured.bind(this);
      };

      return Regex;
    }(count_in_In); // CONCATENATED MODULE: ./src/worker/business/count/where.ts


    var count_where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var count_where_Where =
    /** @class */
    function (_super) {
      count_where_extends(Where, _super);

      function Where() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Where.prototype.executeWhereLogic = function (column, value, op) {
        var _this = this;

        value = op ? value[op] : value;
        var cursorRequest;
        var cursor;
        var initCursorAndFilter;

        if (Object.keys(this.query.where).length === 1 && this.objectStore.count) {
          initCursorAndFilter = function () {
            cursorRequest = _this.objectStore.index(column).count(_this.getKeyRange(value, op));

            cursorRequest.onsuccess = function () {
              _this.resultCount = cursorRequest.result;

              _this.onQueryFinished();
            };
          };
        } else {
          initCursorAndFilter = function () {
            cursorRequest = _this.objectStore.index(column).openCursor(_this.getKeyRange(value, op));

            cursorRequest.onsuccess = function (e) {
              cursor = e.target.result;

              if (cursor) {
                if (_this.whereCheckerInstance.check(cursor.value)) {
                  ++_this.resultCount;
                }

                cursor.continue();
              } else {
                _this.onQueryFinished();
              }
            };
          };
        }

        initCursorAndFilter();
        cursorRequest.onerror = this.onErrorOccured.bind(this);
      };

      return Where;
    }(count_regex_Regex); // CONCATENATED MODULE: ./src/worker/business/count/instance.ts


    var count_instance_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var count_instance_Instance =
    /** @class */
    function (_super) {
      count_instance_extends(Instance, _super);

      function Instance(query, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onError = onError;
        _this.onSuccess = onSuccess;
        _this.query = query;
        _this.tableName = query.from;
        return _this;
      }

      Instance.prototype.execute = function () {
        var _this = this;

        var queryHelper = new query_helper_QueryHelper(API.Count, this.query);
        queryHelper.checkAndModify();

        if (queryHelper.error == null) {
          try {
            var getDataFromSelect = function () {
              var selectInstance = new instance_Instance(_this.query, function (results) {
                _this.resultCount = results.length;

                _this.onTransactionCompleted_();
              }, _this.onError);
              selectInstance.execute();
            };

            if (this.query.join == null) {
              if (this.query.where != null) {
                if (this.query.where.or || isArray(this.query.where)) {
                  getDataFromSelect();
                } else {
                  this.initTransaction_();
                  this.goToWhereLogic();
                }
              } else {
                this.initTransaction_();
                this.executeWhereUndefinedLogic();
              }
            } else {
              getDataFromSelect();
            }
          } catch (ex) {
            this.onExceptionOccured(ex);
          }
        } else {
          this.onError(queryHelper.error);
        }
      };

      Instance.prototype.initTransaction_ = function () {
        this.createTransaction([this.query.from], this.onTransactionCompleted_, IDB_MODE.ReadOnly);
        this.objectStore = this.transaction.objectStore(this.query.from);
      };

      return Instance;
    }(count_where_Where); // CONCATENATED MODULE: ./src/worker/business/insert/instance.ts


    var insert_instance_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var insert_instance_Instance =
    /** @class */
    function (_super) {
      insert_instance_extends(Instance, _super);

      function Instance(query, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.valuesAffected_ = [];

        _this.onTransactionCompleted_ = function () {
          if (_this.error == null) {
            _this.onSuccess(_this.query.return === true ? _this.valuesAffected_ : _this.rowAffected);
          } else {
            _this.onError(_this.error);
          }
        };

        _this.onError = onError;
        _this.query = query;
        _this.onSuccess = onSuccess;
        _this.tableName = _this.query.into;
        return _this;
      }

      Instance.prototype.execute = function () {
        var _this = this;

        var queryHelper = new query_helper_QueryHelper(API.Insert, this.query);
        queryHelper.checkAndModify().then(function () {
          _this.query = queryHelper.query;

          _this.insertData_(_this.query.values);
        }).catch(this.onError);
      };

      Instance.prototype.onQueryFinished_ = function () {
        if (this.isTransaction === true) {
          this.onTransactionCompleted_();
        }
      };

      Instance.prototype.insertData_ = function (values) {
        var _this = this;

        var objectStore;
        var onInsertData;
        var addMethod;

        if (this.query.return) {
          onInsertData = function (value) {
            _this.valuesAffected_.push(value);
          };
        } else {
          onInsertData = function () {
            ++_this.rowAffected;
          };
        }

        this.createTransaction([this.tableName], this.onTransactionCompleted_);
        objectStore = this.transaction.objectStore(this.tableName);

        if (this.query.upsert) {
          addMethod = function (value) {
            return objectStore.put(value);
          };
        } else {
          addMethod = function (value) {
            return objectStore.add(value);
          };
        }

        promiseAll(values.map(function (value) {
          return promise(function (res, rej) {
            var addResult = addMethod(value);
            addResult.onerror = rej;

            addResult.onsuccess = function () {
              onInsertData(value);
              res();
            };
          });
        })).then(function () {
          _this.onQueryFinished_();
        }).catch(function (err) {
          _this.transaction.abort();

          _this.onErrorOccured(err);
        });
      };

      return Instance;
    }(base_Base); // CONCATENATED MODULE: ./src/worker/business/remove/base_remove.ts


    var base_remove_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var BaseRemove =
    /** @class */
    function (_super) {
      base_remove_extends(BaseRemove, _super);

      function BaseRemove() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      BaseRemove.prototype.onQueryFinished = function () {// ff
      };

      return BaseRemove;
    }(WhereBase); // CONCATENATED MODULE: ./src/worker/business/remove/not_where.ts


    var remove_not_where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var remove_not_where_NotWhere =
    /** @class */
    function (_super) {
      remove_not_where_extends(NotWhere, _super);

      function NotWhere() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      NotWhere.prototype.executeWhereUndefinedLogic = function () {
        var _this = this;

        var cursor;
        var cursorRequest = this.objectStore.openCursor();

        cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            cursor.delete();
            ++_this.rowAffected;
            cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };

        cursorRequest.onerror = this.onErrorOccured.bind(this);
      };

      return NotWhere;
    }(BaseRemove); // CONCATENATED MODULE: ./src/worker/business/remove/in.ts


    var remove_in_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var remove_in_In =
    /** @class */
    function (_super) {
      remove_in_extends(In, _super);

      function In() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      In.prototype.executeInLogic = function (column, values) {
        var _this = this;

        var cursor, cursorRequest;

        var runInLogic = function (value) {
          return promise(function (res, rej) {
            cursorRequest = _this.objectStore.index(column).openCursor(_this.getKeyRange(value));

            cursorRequest.onsuccess = function (e) {
              cursor = e.target.result;

              if (cursor) {
                if (_this.whereCheckerInstance.check(cursor.value)) {
                  cursor.delete();
                  ++_this.rowAffected;
                }

                cursor.continue();
              } else {
                res();
              }
            };

            cursorRequest.onerror = rej;
          });
        };

        promiseAll(values.map(function (val) {
          return runInLogic(val);
        })).then(function () {
          _this.onQueryFinished();
        }).catch(function (err) {
          _this.onErrorOccured(err);
        });
      };

      return In;
    }(remove_not_where_NotWhere); // CONCATENATED MODULE: ./src/worker/business/remove/regex.ts


    var remove_regex_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var remove_regex_Regex =
    /** @class */
    function (_super) {
      remove_regex_extends(Regex, _super);

      function Regex() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Regex.prototype.executeRegexLogic = function (column, exp) {
        var _this = this;

        var cursor;
        this.regexExpression = exp;
        var cursorRequest = this.objectStore.index(column).openCursor();

        cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            if (_this.regexTest(cursor.key) && _this.whereCheckerInstance.check(cursor.value)) {
              cursor.delete();
              ++_this.rowAffected;
            }

            cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };

        cursorRequest.onerror = this.onErrorOccured.bind(this);
      };

      return Regex;
    }(remove_in_In); // CONCATENATED MODULE: ./src/worker/business/remove/where.ts


    var remove_where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var remove_where_Where =
    /** @class */
    function (_super) {
      remove_where_extends(Where, _super);

      function Where() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Where.prototype.executeWhereLogic = function (column, value, op) {
        var _this = this;

        var cursor, cursorRequest;
        value = op ? value[op] : value;
        cursorRequest = this.objectStore.index(column).openCursor(this.getKeyRange(value, op));

        cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            if (_this.whereCheckerInstance.check(cursor.value)) {
              cursor.delete();
              ++_this.rowAffected;
            }

            cursor.continue();
          } else {
            _this.onQueryFinished();
          }
        };

        cursorRequest.onerror = this.onErrorOccured.bind(this);
      };

      return Where;
    }(remove_regex_Regex); // CONCATENATED MODULE: ./src/worker/business/remove/instance.ts


    var remove_instance_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var remove_instance_Instance =
    /** @class */
    function (_super) {
      remove_instance_extends(Instance, _super);

      function Instance(query, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onTransactionCompleted_ = function () {
          if (_this.error == null) {
            _this.onSuccess(_this.rowAffected);
          } else {
            _this.onError(_this.error);
          }
        };

        _this.query = query;
        _this.onSuccess = onSuccess;
        _this.onError = onError;
        _this.tableName = _this.query.from;
        return _this;
      }

      Instance.prototype.execute = function () {
        var queryHelper = new query_helper_QueryHelper(API.Remove, this.query);
        queryHelper.checkAndModify();

        if (queryHelper.error == null) {
          try {
            this.initTransaction_();

            if (this.query.where != null) {
              if (isArray(this.query.where)) {
                this.processWhereArrayQry();
              } else {
                this.processWhere_();
              }
            } else {
              this.executeWhereUndefinedLogic();
            }
          } catch (ex) {
            this.onExceptionOccured(ex);
          }
        } else {
          this.onError(queryHelper.error);
        }
      };

      Instance.prototype.processWhereArrayQry = function () {
        var _this = this;

        var selectObject = new instance_Instance(this.query, function (results) {
          var _a, _b;

          var keyList = [];

          var pkey = _this.getPrimaryKey(_this.query.from);

          results.forEach(function (item) {
            keyList.push(item[pkey]);
          });
          results = null;
          var whereQry = (_a = {}, _a[pkey] = (_b = {}, _b[QUERY_OPTION.In] = keyList, _b), _a);
          _this.query[QUERY_OPTION.Where] = whereQry;

          _this.processWhere_();
        }, this.onError);
        selectObject.isSubQuery = true;
        selectObject.execute();
      };

      Instance.prototype.processWhere_ = function () {
        if (this.query.where.or) {
          this.processOrLogic();
        }

        this.goToWhereLogic();
      };

      Instance.prototype.initTransaction_ = function () {
        this.createTransaction([this.query.from], this.onTransactionCompleted_);
        this.objectStore = this.transaction.objectStore(this.query.from);
      };

      Instance.prototype.onQueryFinished = function () {
        if (this.isOr === true) {
          this.orQuerySuccess_();
        } else if (this.isTransaction === true) {
          this.onTransactionCompleted_();
        }
      };

      Instance.prototype.orQuerySuccess_ = function () {
        var key = getObjectFirstKey(this._orInfo.OrQuery);

        if (key != null) {
          var where = {};
          where[key] = this._orInfo.OrQuery[key];
          delete this._orInfo.OrQuery[key];
          this.query.where = where;
          this.goToWhereLogic();
        } else {
          this.isOr = true;
        }
      };

      Instance.prototype.processOrLogic = function () {
        this.isOr = true;
        this._orInfo = {
          OrQuery: this.query.where.or
        }; // free or memory

        delete this.query.where.or;
      };

      return Instance;
    }(remove_where_Where); // CONCATENATED MODULE: ./src/worker/business/update/base_update.ts


    var base_update_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var updateValue = function (suppliedValue, storedValue) {
      for (var key in suppliedValue) {
        if (getDataType(suppliedValue[key]) !== DATA_TYPE.Object) {
          storedValue[key] = suppliedValue[key];
        } else {
          for (var op in suppliedValue[key]) {
            switch (op) {
              case '+':
                storedValue[key] += suppliedValue[key][op];
                break;

              case '-':
                storedValue[key] -= suppliedValue[key][op];
                break;

              case '*':
                storedValue[key] *= suppliedValue[key][op];
                break;

              case '/':
                storedValue[key] /= suppliedValue[key][op];
                break;

              case '{push}':
                storedValue[key].push(suppliedValue[key][op]);
                break;

              default:
                storedValue[key] = suppliedValue[key];
            }

            break;
          }
        }
      }

      return storedValue;
    };

    var BaseUpdate =
    /** @class */
    function (_super) {
      base_update_extends(BaseUpdate, _super);

      function BaseUpdate() {
        var _this = _super !== null && _super.apply(this, arguments) || this;

        _this.onTransactionCompleted_ = function () {
          if (_this.error) {
            _this.onError(_this.error);
          } else {
            _this.onSuccess(_this.rowAffected);
          }
        };

        return _this;
      }

      BaseUpdate.prototype.initTransaction = function () {
        this.createTransaction([this.query.in], this.onTransactionCompleted_);
        this.objectStore = this.transaction.objectStore(this.query.in);
      };

      BaseUpdate.prototype.onQueryFinished = function () {
        if (this.isTransaction === true) {
          this.onTransactionCompleted_();
        }
      };

      return BaseUpdate;
    }(base_Base); // CONCATENATED MODULE: ./src/worker/business/update/not_where.ts


    var update_not_where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var update_not_where_NotWhere =
    /** @class */
    function (_super) {
      update_not_where_extends(NotWhere, _super);

      function NotWhere() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      NotWhere.prototype.executeWhereUndefinedLogic = function () {
        var _this = this;

        var cursor;
        var cursorRequest = this.objectStore.openCursor();

        cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            try {
              var cursorUpdateRequest = cursor.update(updateValue(_this.query.set, cursor.value));

              cursorUpdateRequest.onsuccess = function () {
                ++_this.rowAffected;
                cursor.continue();
              };

              cursorUpdateRequest.onerror = _this.onErrorOccured.bind(_this);
            } catch (err) {
              _this.onErrorOccured(err);

              _this.transaction.abort();
            }
          } else {
            _this.onQueryFinished();
          }
        };

        cursorRequest.onerror = this.onErrorOccured.bind(this);
      };

      return NotWhere;
    }(BaseUpdate); // CONCATENATED MODULE: ./src/worker/business/update/in.ts


    var update_in_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var update_in_In =
    /** @class */
    function (_super) {
      update_in_extends(In, _super);

      function In() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      In.prototype.executeInLogic = function (column, values) {
        var _this = this;

        var cursor;
        var columnStore = this.objectStore.index(column);
        var cursorRequest;

        var runInLogic = function (value) {
          return promise(function (res, rej) {
            cursorRequest = columnStore.openCursor(_this.getKeyRange(value));

            cursorRequest.onsuccess = function (e) {
              cursor = e.target.result;

              if (cursor) {
                if (_this.whereCheckerInstance.check(cursor.value)) {
                  cursor.update(updateValue(_this.query.set, cursor.value));
                  ++_this.rowAffected;
                }

                cursor.continue();
              } else {
                res();
              }
            };

            cursorRequest.onerror = rej;
          });
        };

        promiseAll(values.map(function (val) {
          return runInLogic(val);
        })).then(function () {
          _this.onQueryFinished();
        }).catch(function (err) {
          _this.onErrorOccured(err);
        });
      };

      return In;
    }(update_not_where_NotWhere); // CONCATENATED MODULE: ./src/worker/business/update/regex.ts


    var update_regex_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var update_regex_Regex =
    /** @class */
    function (_super) {
      update_regex_extends(Regex, _super);

      function Regex() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Regex.prototype.executeRegexLogic = function (column, exp) {
        var _this = this;

        var cursor;
        this.regexExpression = exp;
        var cursorOpenRequest = this.objectStore.index(column).openCursor();

        cursorOpenRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            if (_this.regexTest(cursor.key) && _this.whereCheckerInstance.check(cursor.value)) {
              try {
                var cursorUpdateRequest = cursor.update(updateValue(_this.query.set, cursor.value));

                cursorUpdateRequest.onsuccess = function () {
                  ++_this.rowAffected;
                  cursor.continue();
                };

                cursorUpdateRequest.onerror = _this.onErrorOccured.bind(_this);
              } catch (err) {
                _this.transaction.abort();

                _this.onErrorOccured(err);
              }
            } else {
              cursor.continue();
            }
          } else {
            _this.onQueryFinished();
          }
        };

        cursorOpenRequest.onerror = this.onErrorOccured.bind(this);
      };

      return Regex;
    }(update_in_In); // CONCATENATED MODULE: ./src/worker/business/update/where.ts


    var update_where_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var update_where_Where =
    /** @class */
    function (_super) {
      update_where_extends(Where, _super);

      function Where() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Where.prototype.executeWhereLogic = function (column, value, op) {
        var _this = this;

        var cursor, cursorRequest;
        value = op ? value[op] : value;
        cursorRequest = this.objectStore.index(column).openCursor(this.getKeyRange(value, op));

        cursorRequest.onsuccess = function (e) {
          cursor = e.target.result;

          if (cursor) {
            if (_this.whereCheckerInstance.check(cursor.value)) {
              try {
                var cursorUpdateRequest = cursor.update(updateValue(_this.query.set, cursor.value));

                cursorUpdateRequest.onsuccess = function () {
                  ++_this.rowAffected;
                  cursor.continue();
                };

                cursorUpdateRequest.onerror = _this.onErrorOccured.bind(_this);
              } catch (err) {
                _this.transaction.abort();

                _this.onErrorOccured(err);
              }
            } else {
              cursor.continue();
            }
          } else {
            _this.onQueryFinished();
          }
        };

        cursorRequest.onerror = this.onErrorOccured.bind(this);
      };

      return Where;
    }(update_regex_Regex); // CONCATENATED MODULE: ./src/worker/business/update/instance.ts


    var update_instance_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var update_instance_Instance =
    /** @class */
    function (_super) {
      update_instance_extends(Instance, _super);

      function Instance(query, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.onSuccess = onSuccess;
        _this.onError = onError;
        _this.query = query;
        _this.tableName = _this.query.in;
        return _this;
      }

      Instance.prototype.execute = function () {
        var queryHelper = new query_helper_QueryHelper(API.Update, this.query);
        queryHelper.checkAndModify();

        if (queryHelper.error == null) {
          try {
            this.initTransaction();

            if (this.query.where != null) {
              if (this.query.where.or || isArray(this.query.where)) {
                this.executeComplexLogic_();
              } else {
                this.goToWhereLogic();
              }
            } else {
              this.executeWhereUndefinedLogic();
            }
          } catch (ex) {
            this.onExceptionOccured(ex);
          }
        } else {
          this.onError(queryHelper.error);
        }
      };

      Instance.prototype.executeComplexLogic_ = function () {
        var _this = this;

        var selectObject = new instance_Instance({
          from: this.query.in,
          where: this.query.where,
          ignoreCase: this.query.ignoreCase
        }, function (results) {
          var _a, _b;

          var key = _this.getPrimaryKey(_this.query.in);

          var inQuery = [];
          results.forEach(function (value) {
            inQuery.push(value[key]);
          });
          results = null;
          var whereQry = (_a = {}, _a[key] = (_b = {}, _b[QUERY_OPTION.In] = inQuery, _b), _a);
          _this.query.ignoreCase = null;
          _this.query[QUERY_OPTION.Where] = whereQry;

          _this.initTransaction();

          _this.goToWhereLogic();
        }, this.onError);
        selectObject.isSubQuery = true;
        selectObject.execute();
      };

      return Instance;
    }(update_where_Where); // CONCATENATED MODULE: ./src/worker/business/transaction/instance.ts


    var transaction_instance_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var transaction_instance_Instance =
    /** @class */
    function (_super) {
      transaction_instance_extends(Instance, _super);

      function Instance(qry, onSuccess, onError) {
        var _this = _super.call(this) || this;

        _this.reqQueue = [];
        _this.isQueryExecuting = false;
        _this.isTxStarted_ = false;
        _this.query = qry;
        _this.onError = onError;
        _this.onSuccess = onSuccess;
        _this.results = {};
        return _this;
      }

      Instance.prototype.execute = function () {
        var _this = this;

        var notExistingTable = this.getNotExistingTable_(this.query.tables);

        if (notExistingTable != null) {
          this.onError(new log_helper_LogHelper(ERROR_TYPE.TableNotExist, {
            tableName: notExistingTable
          }).get());
          return;
        }

        promiseAll(this.query.tables.map(function (table) {
          return getAutoIncrementValues(_this.getTable(table));
        })).then(function (results) {
          results.forEach(function (result, index) {
            query_helper_QueryHelper.autoIncrementValues[_this.query.tables[index]] = result;
          });

          _this.startExecution_();
        }).catch(this.onError);
      };

      Instance.prototype.startExecution_ = function () {
        var _this = this;

        var select = function (qry) {
          return _this.pushReq_({
            name: API.Select,
            query: qry
          });
        };

        var insert = function (qry) {
          return _this.pushReq_({
            name: API.Insert,
            query: qry
          });
        };

        var update = function (qry) {
          return _this.pushReq_({
            name: API.Update,
            query: qry
          });
        };

        var remove = function (qry) {
          return _this.pushReq_({
            name: API.Remove,
            query: qry
          });
        };

        var count = function (qry) {
          return _this.pushReq_({
            name: API.Count,
            query: qry
          });
        };

        var methodName = this.query.method;
        var txLogic = self[methodName];

        if (!txLogic) {
          return this.onError({
            type: ERROR_TYPE.MethodNotExist,
            message: "method " + methodName + " does not exist."
          });
        }

        txLogic.call(this, {
          data: this.query.data,
          insert: insert,
          select: select,
          update: update,
          remove: remove,
          count: count,
          setResult: function (key, value) {
            _this.results[key] = value;
          },
          getResult: function (key) {
            return _this.results[key];
          },
          abort: function (msg) {
            _this.abortTx_(msg);
          },
          start: function () {
            _this.checkQueries_(_this.reqQueue).then(function () {
              _this.startTx_();
            }).catch(function (err) {
              _this.onError(err);
            });
          }
        });
        console.log("transaction query started");
      };

      Instance.prototype.startTx_ = function () {
        try {
          this.isTxStarted_ = true;
          this.initTx_(this.query.tables);
          this.processExecutionOfQry_();
        } catch (ex) {
          this.onExceptionOccured(ex);
        }
      };

      Instance.prototype.initTx_ = function (tableNames) {
        this.createTransaction(tableNames, this.onTxCompleted_.bind(this));
      };

      Instance.prototype.onTxCompleted_ = function () {
        console.log("transaction finished");
        this.onSuccess(this.results);
      };

      Instance.prototype.onReqFinished_ = function (result) {
        var finisehdRequest = this.reqQueue.shift();
        console.log("finished request : " + finisehdRequest.name + " ");

        if (finisehdRequest) {
          if (this.error) {
            this.abortTx_("automatic abort of transaction due to error occured");
            console.log("transaction aborted due to error occured");
            this.onErrorOccured(this.error);
          } else {
            this.isQueryExecuting = false;

            if (finisehdRequest.onSuccess) {
              finisehdRequest.onSuccess(result);
            }

            this.processExecutionOfQry_();
          }
        }
      };

      Instance.prototype.abortTx_ = function (msg) {
        if (this.transaction != null) {
          this.transaction.abort();
          console.log("transaction aborted. Msg : " + msg);
        }
      };

      Instance.prototype.executeRequest_ = function (request) {
        this.isQueryExecuting = true;
        var requestObj;
        console.log("executing request : " + request.name + " ");
        var onReqFinished = this.onReqFinished_.bind(this);
        var onError = this.onError.bind(this);
        var query = request.query;

        switch (request.name) {
          case API.Select:
            requestObj = new instance_Instance(query, onReqFinished, onError);
            break;

          case API.Insert:
            requestObj = new insert_instance_Instance(query, onReqFinished, onError);
            break;

          case API.Update:
            requestObj = new update_instance_Instance(query, onReqFinished, onError);
            break;

          case API.Remove:
            requestObj = new remove_instance_Instance(query, onReqFinished, onError);
            break;

          case API.Count:
            requestObj = new count_instance_Instance(query, onReqFinished, onError);
            break;
        }

        requestObj.isTransaction = true;
        requestObj.execute();
      };

      Instance.prototype.pushReq_ = function (request) {
        var _this = this;

        var push = function () {
          _this.reqQueue.push(request);
        };

        var promiseObj = promise(function (resolve, reject) {
          request.onSuccess = function (result) {
            resolve(result);
          };

          request.onError = function (error) {
            _this.error = error;
            reject(error);
          };
        });

        if (this.isTxStarted_ === true) {
          this.checkQueries_([request]).then(function () {
            push();

            _this.processExecutionOfQry_();
          }).catch(function (err) {
            _this.error = err;

            _this.abortTx_(JSON.stringify(err));
          });
        } else {
          push();
        }

        console.log("request pushed : " + request.name + " with query value - " + JSON.stringify(request.query));
        return promiseObj;
      };

      Instance.prototype.processExecutionOfQry_ = function () {
        if (this.reqQueue.length > 0 && this.isQueryExecuting === false) {
          this.executeRequest_(this.reqQueue[0]);
        }
      };

      Instance.prototype.checkQueries_ = function (requestQueue) {
        return promiseAll(requestQueue.map(function (request) {
          return new query_helper_QueryHelper(request.name, request.query).checkAndModify();
        }));
      };

      Instance.prototype.getNotExistingTable_ = function (tables) {
        var _this = this;

        var invalidTable = null;
        tables.every(function (table) {
          if (_this.isTableExist(table) === false) {
            invalidTable = table;
            return false;
          }

          return true;
        });
        return invalidTable;
      };

      return Instance;
    }(base_Base); // CONCATENATED MODULE: ./src/worker/model/table_helper.ts


    var table_helper_TableHelper =
    /** @class */
    function () {
      function TableHelper(table) {
        this.columns = [];
        this.requireDelete = false;
        this.requireCreation = false;
        this.name = table.name;
        this.version = table.version;
        this.columns = table.columns;
        this.setPrimaryKey_();
      }

      TableHelper.prototype.createMetaData = function (dbName) {
        var _this = this;

        return promise(function (resolve) {
          _this.callback_ = resolve;

          _this.setRequireDelete_(dbName);

          _this.setDbVersion_(dbName);
        });
      };

      TableHelper.prototype.setPrimaryKey_ = function () {
        var _this = this;

        this.columns.every(function (item) {
          _this.primaryKey = item.primaryKey ? item.name : "";
          return !item.primaryKey;
        });
      };

      TableHelper.prototype.setRequireDelete_ = function (dbName) {
        var _this = this;

        instance_KeyStore.get("JsStore_" + dbName + "_" + this.name + "_Version").then(function (tableVersion) {
          if (tableVersion == null) {
            _this.requireCreation = true;
          } // mark only table which has version greater than store version
          else if (tableVersion < _this.version) {
              _this.requireDelete = true;
            }
        });
      };

      TableHelper.prototype.setDbVersion_ = function (dbName) {
        var _this = this;

        business_idb_helper_IdbHelper.activeDbVersion = business_idb_helper_IdbHelper.activeDbVersion > this.version ? business_idb_helper_IdbHelper.activeDbVersion : this.version; // setting db version

        instance_KeyStore.set("JsStore_" + dbName + "_Db_Version", business_idb_helper_IdbHelper.activeDbVersion); // setting table version

        instance_KeyStore.set("JsStore_" + dbName + "_" + this.name + "_Version", business_idb_helper_IdbHelper.activeDbVersion).then(function () {
          _this.version = business_idb_helper_IdbHelper.activeDbVersion;

          _this.callback_(_this);
        });
      };

      return TableHelper;
    }(); // CONCATENATED MODULE: ./src/worker/model/db_helper.ts


    var db_helper_DbHelper =
    /** @class */
    function () {
      function DbHelper(dataBase) {
        this.tables = [];
        this.dbName = dataBase.name;
        this.tables = dataBase.tables;
      }

      DbHelper.prototype.createMetaData = function () {
        var _this = this;

        return promiseAll(this.tables.map(function (table) {
          return new table_helper_TableHelper(table).createMetaData(_this.dbName);
        }));
      };

      return DbHelper;
    }(); // CONCATENATED MODULE: ./src/worker/model/column.ts


    var Column =
    /** @class */
    function () {
      return function (key) {
        this.name = key.name;
        this.autoIncrement = key.autoIncrement != null ? key.autoIncrement : false;
        this.primaryKey = key.primaryKey != null ? key.primaryKey : false;
        this.unique = key.unique != null ? key.unique : false;
        this.notNull = key.notNull != null ? key.notNull : false;
        this.dataType = key.dataType != null ? key.dataType : key.autoIncrement ? 'number' : null;
        this.default = key.default;
        this.multiEntry = key.multiEntry == null ? false : key.multiEntry;
        this.enableSearch = key.enableSearch == null ? true : key.enableSearch;
        this.keyPath = key.keyPath;
      };
    }(); // CONCATENATED MODULE: ./src/worker/model/table.ts


    var table_Table =
    /** @class */
    function () {
      return function (table) {
        this.columns = [];
        this.name = table.name;
        this.version = table.version == null ? 1 : table.version;

        for (var columnName in table.columns) {
          var column = {
            name: columnName
          };

          for (var feature in table.columns[columnName]) {
            var value = table.columns[columnName][feature];

            switch (feature) {
              case 'primaryKey':
              case 'autoIncrement':
              case 'unique':
              case 'dataType':
              case 'enableSearch':
              case 'keyPath':
              case 'multiEntry':
              case 'default':
              case 'notNull':
                column[feature] = value;
                break;
            }
          }

          this.columns.push(new Column(column));
        }
      };
    }(); // CONCATENATED MODULE: ./src/worker/model/database.ts


    var database_DataBase =
    /** @class */
    function () {
      return function (dataBase) {
        var _this = this;

        this.tables = [];
        this.name = dataBase.name;
        dataBase.tables.forEach(function (item) {
          _this.tables.push(new table_Table(item));
        });
      };
    }(); // CONCATENATED MODULE: ./src/worker/business/union/index.ts


    var union_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var union_Union =
    /** @class */
    function (_super) {
      union_extends(Union, _super);

      function Union() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Union.prototype.execute = function (query, onSuccess, onError) {
        var index = 0;
        var hashMap = {};
        var isQueryForSameTable = true;
        var queryLength = query.length;
        query.every(function (qry, i) {
          if (i + 1 < queryLength && qry.from !== query[i + 1].from) {
            isQueryForSameTable = false;
            return false;
          }

          return true;
        });
        var getHashKey;

        if (isQueryForSameTable) {
          var pKey_1 = this.getPrimaryKey(query[0].from);

          getHashKey = function (val) {
            return val[pKey_1];
          };
        } else {
          getHashKey = function (val) {
            var columnValKey = "";

            for (var key in val) {
              columnValKey += val[key];
            }

            return columnValKey;
          };
        }

        var fetchData = function () {
          if (index < query.length) {
            new instance_Instance(query[index++], function (selectResult) {
              selectResult.forEach(function (val) {
                hashMap[getHashKey(val)] = val;
              });
              fetchData();
            }, onError).execute();
          } else {
            var results = [];

            for (var key in hashMap) {
              results.push(hashMap[key]);
            }

            onSuccess(results);
          }
        };

        fetchData();
      };

      return Union;
    }(base_Base); // CONCATENATED MODULE: ./src/worker/business/intersect/index.ts


    var intersect_extends = undefined && undefined.__extends || function () {
      var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf || {
          __proto__: []
        } instanceof Array && function (d, b) {
          d.__proto__ = b;
        } || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        };

        return extendStatics(d, b);
      };

      return function (d, b) {
        extendStatics(d, b);

        function __() {
          this.constructor = d;
        }

        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();

    var intersect_assign = undefined && undefined.__assign || function () {
      intersect_assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];

          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }

        return t;
      };

      return intersect_assign.apply(this, arguments);
    };

    var intersect_Intersect =
    /** @class */
    function (_super) {
      intersect_extends(Intersect, _super);

      function Intersect() {
        return _super !== null && _super.apply(this, arguments) || this;
      }

      Intersect.prototype.execute = function (intersectQry, onSuccess, onError) {
        var _this = this;

        this.query = intersectQry;
        var index = 0;
        var hashMap = {};
        var hashMapTemp = {};
        var isQueryForSameTable = true;
        var query = intersectQry.queries;
        var queryLength = query.length;
        query.every(function (qry, i) {
          if (i + 1 < queryLength && qry.from !== query[i + 1].from) {
            isQueryForSameTable = false;
            return false;
          }

          return true;
        });
        var getHashKey;

        if (isQueryForSameTable) {
          var pKey_1 = this.getPrimaryKey(query[0].from);

          getHashKey = function (val) {
            return val[pKey_1];
          };
        } else {
          getHashKey = function (val) {
            var columnValKey = "";

            for (var key in val) {
              columnValKey += val[key];
            }

            return columnValKey;
          };
        }

        var fetchData = function () {
          if (index < queryLength) {
            new instance_Instance(query[index], function (selectResult) {
              hashMap = {};
              selectResult.forEach(function (val) {
                var columnValKey = getHashKey(val);

                if (index === 0) {
                  hashMapTemp[columnValKey] = val;
                } else if (hashMapTemp[columnValKey] != null) {
                  hashMap[columnValKey] = val;
                }
              });

              if (index > 0) {
                hashMapTemp = intersect_assign({}, hashMap);
              }

              ++index;
              fetchData();
            }, onError).execute();
          } else {
            var results_1 = [];
            var resultPusher = void 0;
            var skip_1 = intersectQry.skip;
            var limit_1 = intersectQry.limit;

            var onFinished = function () {
              _this.results = results_1;
              _this.query.join = {};

              _this.processOrderBy();

              _this.processGroupDistinctAggr();

              onSuccess(_this.results);
            };

            var shouldStopLoop_1 = false;

            var pushResult_1 = function () {
              results_1.push(hashMap[key_1]);
            };

            var checkLimitAndPush_1 = function () {
              if (results_1.length < limit_1) {
                pushResult_1();
              } else {
                shouldStopLoop_1 = true;
              }
            };

            var skipChecker_1 = function (callBack) {
              if (skip_1 === 0) {
                callBack();
              } else {
                --skip_1;
              }
            };

            if (intersectQry.skip && intersectQry.limit) {
              resultPusher = function () {
                skipChecker_1(function () {
                  checkLimitAndPush_1();
                });
              };
            } else if (intersectQry.limit) {
              resultPusher = checkLimitAndPush_1;
            } else if (intersectQry.skip) {
              resultPusher = function () {
                skipChecker_1(function () {
                  pushResult_1();
                });
              };
            } else {
              resultPusher = function () {
                pushResult_1();
              };
            }

            if (limit_1) {
              for (var key_1 in hashMap) {
                resultPusher(key_1);

                if (shouldStopLoop_1) {
                  break;
                }
              }
            } else {
              for (key_1 in hashMap) {
                resultPusher(key_1);
              }
            }

            onFinished();
          }
        };

        fetchData();
      };

      return Intersect;
    }(orderby_helper_Helper); // CONCATENATED MODULE: ./src/worker/query_executor.ts


    var worker_query_executor_QueryExecutor =
    /** @class */
    function () {
      function QueryExecutor(fn) {
        this.onQueryFinished = fn;
        query_helper_QueryHelper.autoIncrementValues = {};
      }

      QueryExecutor.prototype.checkConnectionAndExecuteLogic = function (request) {
        var _this = this;

        log_helper_LogHelper.log('request executing:' + request.name);

        switch (request.name) {
          case API.InitDb:
          case API.IsDbExist:
          case API.GetDbVersion:
          case API.GetDbList:
          case API.GetDbSchema:
          case API.Get:
          case API.Set:
          case API.ChangeLogStatus:
          case API.Terminate:
          case API.OpenDb:
          case API.InitKeyStore:
          case API.CloseDb:
            var err = this.checkForIdbSupport_();

            if (err == null) {
              this.executeLogic_(request);
            } else {
              this.returnResult_({
                errorDetails: err,
                errorOccured: true
              });
            }

            break;

          default:
            switch (this.dbStatus_.conStatus) {
              case CONNECTION_STATUS.Connected:
                {
                  this.executeLogic_(request);
                }
                break;

              case CONNECTION_STATUS.Closed:
                {
                  if (this.isDbDeletedByBrowser_ === true) {
                    this.initDb_(null, function () {
                      _this.isDbDeletedByBrowser_ = false;

                      _this.checkConnectionAndExecuteLogic(request);
                    }, request.onError);
                  } else {
                    this.initDb_(this.activeDb_, function () {
                      _this.checkConnectionAndExecuteLogic(request);
                    }, request.onError);
                  }
                }
                break;
            }

        }
      };

      QueryExecutor.prototype.changeLogStatus_ = function (status, onSuccess) {
        Config.isLogEnabled = status;
        onSuccess();
      };

      QueryExecutor.prototype.returnResult_ = function (result) {
        if (Config.isRuningInWorker === true) {
          self.postMessage(result);
        } else {
          this.onQueryFinished(result);
        }
      };

      QueryExecutor.prototype.executeLogic_ = function (request) {
        var _this = this;

        var onSuccess = function (results) {
          _this.returnResult_({
            returnedValue: results
          });
        };

        var onError = function (err) {
          _this.returnResult_({
            errorDetails: err,
            errorOccured: true
          });
        };

        QueryExecutor.isTransactionQuery = request.name === API.Transaction;

        switch (request.name) {
          case API.InitDb:
            if (this.isDbDeletedByBrowser_ === true) {
              this.initDb_(null, function () {
                _this.isDbDeletedByBrowser_ = false;
                onSuccess();
              }, onError);
            } else {
              this.initDb_(request.query, onSuccess, onError);
            }

            break;

          case API.OpenDb:
            this.openDb_(request.query, onSuccess, onError);
            break;

          case API.Select:
            new instance_Instance(request.query, onSuccess, onError).execute();
            break;

          case API.Insert:
            new insert_instance_Instance(request.query, onSuccess, onError).execute();
            break;

          case API.Update:
            new update_instance_Instance(request.query, onSuccess, onError).execute();
            break;

          case API.Remove:
            new remove_instance_Instance(request.query, onSuccess, onError).execute();
            break;

          case API.IsDbExist:
            this.isDbExist_(request.query, onSuccess, onError);
            break;

          case API.GetDbVersion:
            this.getDbVersion_(request.query).then(onSuccess).catch(onError);
            break;

          case API.GetDbList:
            this.getDbList_().then(onSuccess).catch(onError);
            break;

          case API.GetDbSchema:
            this.getDbSchema_(request.query).then(onSuccess).catch(onError);
            break;

          case API.Clear:
            new clear_Clear(request.query, onSuccess, onError).execute();
            break;

          case API.DropDb:
            this.dropDb_(onSuccess, onError);
            break;

          case API.Count:
            new count_instance_Instance(request.query, onSuccess, onError).execute();
            break;

          case API.Get:
            this.get_(request.query).then(onSuccess).catch(onError);
            break;

          case API.Set:
            this.set_(request.query).then(onSuccess).catch(onError);
            break;

          case API.ChangeLogStatus:
            this.changeLogStatus_(request.query, onSuccess, onError);
            break;

          case API.Transaction:
            new transaction_instance_Instance(request.query, onSuccess, onError).execute();
            break;

          case API.CloseDb:
          case API.Terminate:
            this.terminate_(onSuccess, onError);
            break;

          case API.Union:
            new union_Union().execute(request.query, onSuccess, onError);
            break;

          case API.InitKeyStore:
            this.initKeyStore_(onSuccess);
            break;

          case API.Intersect:
            new intersect_Intersect().execute(request.query, onSuccess, onError);
            break;

          case API.ImportScripts:
            try {
              importScripts.apply(void 0, request.query);
              onSuccess();
            } catch (e) {
              onError({
                type: ERROR_TYPE.ImportScriptsFailed,
                message: e.message
              });
            }

            break;

          default:
            console.error('The Api:-' + request.name + ' does not support.');
        }
      };

      QueryExecutor.prototype.openDb_ = function (dbName, onSuccess, onError) {
        var _this = this;

        if (this.activeDb_ != null && this.activeDb_.name === dbName) {
          this.processCreateDb(this.activeDb_).then(onSuccess).catch(onError);
        } else {
          this.getDbSchema_(dbName).then(function (db) {
            if (db != null) {
              _this.processCreateDb(db).then(onSuccess).catch(onError);
            } else {
              onError(new log_helper_LogHelper(ERROR_TYPE.DbNotExist, {
                dbName: dbName
              }).get());
            }
          }).catch(onError);
        }
      };

      QueryExecutor.prototype.initKeyStore_ = function (onSuccess) {
        instance_KeyStore.init().then(onSuccess()).catch(function () {
          business_idb_helper_IdbHelper.dbStatus = {
            conStatus: CONNECTION_STATUS.UnableToStart,
            lastError: ERROR_TYPE.IndexedDbNotSupported
          };
        });
      };

      QueryExecutor.prototype.getDbSchema_ = function (dbName) {
        return business_idb_helper_IdbHelper.getDbSchema(dbName);
      };

      QueryExecutor.prototype.terminate_ = function (onSuccess) {
        var _this = this;

        instance_KeyStore.close().then(function () {
          _this.closeDb_();

          onSuccess();
        });
      };

      Object.defineProperty(QueryExecutor.prototype, "isDbDeletedByBrowser_", {
        get: function () {
          return business_idb_helper_IdbHelper.isDbDeletedByBrowser;
        },
        set: function (value) {
          business_idb_helper_IdbHelper.isDbDeletedByBrowser = value;
        },
        enumerable: false,
        configurable: true
      });

      QueryExecutor.prototype.getDbList_ = function () {
        return business_idb_helper_IdbHelper.getDbList();
      };

      Object.defineProperty(QueryExecutor.prototype, "activeDb_", {
        get: function () {
          return business_idb_helper_IdbHelper.activeDb;
        },
        set: function (value) {
          business_idb_helper_IdbHelper.activeDb = value;
        },
        enumerable: false,
        configurable: true
      });

      QueryExecutor.prototype.closeDb_ = function () {
        if (business_idb_helper_IdbHelper.dbStatus.conStatus === CONNECTION_STATUS.Connected) {
          business_idb_helper_IdbHelper.dbStatus.conStatus = CONNECTION_STATUS.ClosedByJsStore;
          business_idb_helper_IdbHelper.dbConnection.close();
        }
      };

      QueryExecutor.prototype.dropDb_ = function (onSuccess, onError) {
        this.closeDb_();
        new drop_db_DropDb(onSuccess, onError).deleteDb();
      };

      QueryExecutor.prototype.processCreateDb = function (db) {
        var _this = this;

        return promise(function (res, rej) {
          // create meta data
          var dbHelper = new db_helper_DbHelper(db);
          dbHelper.createMetaData().then(function (tablesMetaData) {
            _this.activeDb_ = db;
            var createDbInstance = new init_db_InitDb(function (isDbCreated) {
              _this.activeDb_ = db;

              if (isDbCreated) {
                // save dbSchema in keystore
                instance_KeyStore.set("JsStore_" + db.name + "_Schema", db);
              }

              res(isDbCreated);
            }, rej);
            createDbInstance.execute(tablesMetaData);
          });
        });
      };

      QueryExecutor.prototype.initDb_ = function (dataBase, onSuccess, onError) {
        var _this = this;

        if (dataBase == null) {
          this.processCreateDb(this.activeDb_);
        } else {
          this.closeDb_();
          this.getDbVersion_(dataBase.name).then(function (version) {
            _this.activeDbVersion_ = version ? version : 1;

            _this.processCreateDb(new database_DataBase(dataBase)).then(onSuccess).catch(onError);
          }).catch(onError);
        }
      };

      Object.defineProperty(QueryExecutor.prototype, "activeDbVersion_", {
        get: function () {
          return business_idb_helper_IdbHelper.activeDbVersion;
        },
        set: function (value) {
          business_idb_helper_IdbHelper.activeDbVersion = value;
        },
        enumerable: false,
        configurable: true
      });

      QueryExecutor.prototype.getDbVersion_ = function (dbName) {
        return business_idb_helper_IdbHelper.getDbVersion(dbName);
      };

      Object.defineProperty(QueryExecutor.prototype, "dbStatus_", {
        get: function () {
          return business_idb_helper_IdbHelper.dbStatus;
        },
        enumerable: false,
        configurable: true
      });

      QueryExecutor.prototype.checkForIdbSupport_ = function () {
        if (this.dbStatus_.conStatus === CONNECTION_STATUS.UnableToStart) {
          var error = {
            type: this.dbStatus_.lastError
          };

          switch (error.type) {
            case ERROR_TYPE.IndexedDbNotSupported:
              error.message = "Browser does not support IndexedDB";
              break;

            default:
              error.message = "unknown error occured";
          }

          return error;
        }
      };

      QueryExecutor.prototype.isDbExist_ = function (dbInfo, onSuccess) {
        if (getDataType(dbInfo) === DATA_TYPE.String) {
          this.getDbVersion_(dbInfo).then(function (dbVersion) {
            onSuccess(Boolean(dbVersion));
          });
        } else {
          this.getDbVersion_(dbInfo.dbName).then(function (dbVersion) {
            onSuccess(dbInfo.table.version <= dbVersion);
          });
        }
      };

      QueryExecutor.prototype.get_ = function (key) {
        return instance_KeyStore.get(key);
      };

      QueryExecutor.prototype.set_ = function (query) {
        return instance_KeyStore.set(query.key, query.value);
      };

      QueryExecutor.isTransactionQuery = false;
      return QueryExecutor;
    }(); // CONCATENATED MODULE: ./src/worker/start.ts


    var initialize = function () {
      if (typeof self.alert === 'undefined' && typeof ServiceWorkerGlobalScope === 'undefined') {
        Config.isRuningInWorker = true;

        self.onmessage = function (e) {
          new worker_query_executor_QueryExecutor().checkConnectionAndExecuteLogic(e.data);
        };
      }
    };

    var onIdbNotSupproted = function () {
      business_idb_helper_IdbHelper.dbStatus = {
        conStatus: CONNECTION_STATUS.UnableToStart,
        lastError: ERROR_TYPE.IndexedDbNotSupported
      };
    };

    (function () {
      try {
        if (!indexedDB) {
          indexedDB = self.mozIndexedDB || self.webkitIndexedDB || self.msIndexedDB;
        }

        if (indexedDB) {
          IDBTransaction = IDBTransaction || self.webkitIDBTransaction || self.msIDBTransaction;
          self.IDBKeyRange = self.IDBKeyRange || self.webkitIDBKeyRange || self.msIDBKeyRange;
        } else {
          onIdbNotSupproted();
        }
      } catch (ex) {
        onIdbNotSupproted();
      }
    })();

    initialize(); // CONCATENATED MODULE: ./src/worker/index.ts

    /***/
  }
  /******/

});