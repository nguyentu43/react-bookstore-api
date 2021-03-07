const { rule, shield, and, or, allow } = require("graphql-shield");

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  return !!ctx.user;
});

const isAdmin = rule()(async (parent, args, ctx, info) => {
  return ctx.user.isAdmin;
});

const isOwner = rule()(async (parent, args, ctx, info) => {
  const path = info.path.key;
  const id = args.id;
  if(path === 'updateOrder'){
    const orders = await ctx.user.getOrders();
    return orders.some(order => order.UserId === ctx.user.id);
  }
  
  if(path === 'updateRating'){
    const ratings = await ctx.user.getRatings();
    return ratings.some(rating => rating.UserId === ctx.user.id);
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
    },
    Mutation: {
      "*": and(isAuthenticated, isAdmin),
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
