"use strict";

const { auditRead, auditLog } = require("../core/audit");

class AuditService {
  constructor(auditPath) {
    this._path = auditPath;
  }

  recent(limit = 100) {
    return auditRead(this._path, limit);
  }

  log(entry) {
    return auditLog(entry, this._path);
  }
}

module.exports = { AuditService };
