const { rule, shield, and, or, not, allow } = require("graphql-shield");

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  return !!ctx.user;
});

const isAdmin = rule()(async (parent, args, ctx, info) => {
  return ctx.user.isAdmin;
});

const permissions = shield(
  {
    Query: {
      "*": allow,
      getUserInfo: isAuthenticated,
      getUserCart: isAuthenticated,
      getUserOrders: isAuthenticated,
      getWishlist: isAuthenticated,
      getPaymentCode: isAuthenticated,
      getOrders: and(isAuthenticated, isAdmin),
      getUsers: and(isAuthenticated, isAdmin),
      getDashboardData: and(isAuthenticated, isAdmin),
    },
    Mutation: {
      "*": and(isAuthenticated, isAdmin),
      addWishlist: isAuthenticated,
      removeWishlist: isAuthenticated,
      checkout: isAuthenticated,
      verifyTokenAndResetPassword: allow,
      requestResetPassword: allow,
      register: allow,
    },
  },
  {
    allowExternalErrors: true,
  }
);

module.exports = permissions;
