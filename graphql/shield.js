const { rule, shield, and, or, not, allow } = require("graphql-shield");

const isAuthenticated = rule()(
  async (parent, args, ctx, info) => {
    return !!ctx.user;
  }
);

const isAdmin = rule()(
  async (parent, args, ctx, info) => {
    return ctx.user.isAdmin;
  }
);

const permissions = shield({
  Query: {
    getUserInfo: isAuthenticated,
    getCategories: allow,
  },
  Mutation: {
  }
});

module.exports = permissions;
