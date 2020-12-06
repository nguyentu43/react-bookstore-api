const { buildSchema } = require("graphql");

const schema = buildSchema(`

    type User {
        id: ID!
        name: String!
        email: String!
        isAdmin: Boolean!
        whistlist: [Product]
        createAt: String
        updatedAt: String
    }

    type Author{
        id: ID!
        name: String!
        avatar: String
        description: String
    }

    type Category{
        id: ID!
        name: String!
        children: [Category]
        icon: String
        parent: Category
    }

    type Product {
        id: ID!
        name: String!
        price: Float!
        discount: Float
        description: String
        slug: String!
        images: [String]
        authors: [Author]
        category: Category
        relatedProducts: [Product]
        startDate: String
        endDate: String
        dealDiscount: Float
        dealQuantity: Int
        soldQuantity: Int
        createdAt: String!
        updatedAt: String!
    }

    type ProductItem{
        id: ID!
        name: String!
        price: Float!
        slug: String!
        discount: Float!
        quantity: Int!
        images: [String]
    }

    type Order{
        id: ID!
        name: String!
        status: String!
        address: String!
        total: Float!
        createdAt: String!
        updatedAt: String!
        user: User
        paymentID: String
        items: [ProductItem]!
    }

    type Cart{
        items: [ProductItem]!
    }

    input UserData{
        name: String!
        email: String!
        password: String!
    }

    input ProductData{
        name: String!
        price: Float!
        discount: Float
        description: String
        images: String
        authors: [ID]
        category: ID
        relatedProducts: [ID]
        startDate: String
        endDate: String
        dealDiscount: Float
        dealQuantity: Int
        soldQuantity: Int
    }

    input CartItemData{
        quantity: Int!
        id: ID!
    }

    input OrderItemData{
        quantity: Int!
        price: Float!
        discount: Float!
        id: ID!
    }

    input OrderData{
        name: String!
        address: String!
        status: String
        total: Float!
        items: [OrderItemData]!
        paymentID: String
    }

    input AuthorData{
        name: String
        avatar: String
        description: String
    }

    input CategoryData{
        name: String
        parentID: ID
        icon: String
    }

    type Query {
        login(email: String!, password: String!): String!
        getCategories: [Category]!
        getAuthors: [Author]!
        getProduct(slug: String!): Product
        getProducts(search: String, offset: Int, limit: Int): [Product]!
        getPaymentCode(amount: Float!, currency: String): String!
        getUserInfo: User!
        getUserCart: Cart!
        getUserOrders: [Order]!
        getOrders: [Order]!
        getDashboardData: String!
    }

    type Mutation{
        register(input: UserData): String!
        createUser(input: UserData!): User!
        requestResetPassword(email: String!): String
        verifyTokenAndResetPassword(token: String!, password: String!): String
        createAuthor(input: AuthorData): Author
        updateAuthor(id: ID, input: AuthorData): Author
        removeAuthor(id: ID): Boolean
        createCategory(input: CategoryData): Category
        updateCategory(id: ID, input: CategoryData): Category
        removeCategory(id: ID): Boolean
        createProduct(input: ProductData!): Product!
        updateProduct(id: ID!, input: ProductData!): Product!
        removeProduct(id: ID!): Boolean!
        addCartItem(input: CartItemData!): Cart!
        removeCartItem(productID: ID!): Cart!
        addOrder(input: OrderData!, userID: ID): Order!
        updateOrder(id: ID!, input: OrderData!): Order!
        removeOrder(id: ID!): Boolean!
    }
`);

module.exports = schema;