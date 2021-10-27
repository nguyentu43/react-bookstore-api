const { rule, shield, and, or, allow } = require("graphql-shield");

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  return !!ctx.user;
});

const isAdmin = rule()(async (parent, args, ctx, info) => {
  return ctx.user.isAdmin;
});

const isOwner = rule()(async (parent, args, ctx, info) => {
  const path = info.path.key;
  const id = Number(args.id);
  if (path === "updateOrder") {
    const orders = await ctx.user.getOrders();
    return orders.some(
      (order) => order.id === id && order.UserId === ctx.user.id
    );
  }

  if (path === "updateRating") {
    const rating = await ctx.user.getRating();
    return rating !== null;
  }
  return false;
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
      getRecommendationProducts: isAuthenticated
    },
    Mutation: {
      "*": and(isAuthenticated, isAdmin),
      addCartItem: isAuthenticated,
      removeCartItem: isAuthenticated,
      addWishlist: isAuthenticated,
      removeWishlist: isAuthenticated,
      updateOrder: and(isAuthenticated, or(isOwner, isAdmin)),
      updateRating: and(isAuthenticated, isOwner),
      removeRating: and(isAuthenticated, or(isOwner, isAdmin)),
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
