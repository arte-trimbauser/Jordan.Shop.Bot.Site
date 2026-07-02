const config = require("../config");

module.exports = function isStaff(member) {
    if (!member || !member.roles) return false;
    return config.STAFF_ROLES.some(id => member.roles.cache.has(id));
};
