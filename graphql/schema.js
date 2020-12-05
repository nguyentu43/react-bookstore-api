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

    type Format{
        id: ID!
        name: String
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
        formats: [Format]
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
        format: Format
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
        formats: [ID]
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
        format: ID!
        id: ID!
    }

    input OrderItemData{
        quantity: Int!
        price: Float!
        discount: Float!
        format: ID!
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

    type Query {
        login(email: String!, password: String!): String!
        getCategories: [Category]!
        getAuthors: [Author]!
        getFormats: [Format]!
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
        createAuthor(name: String, avatar: String, description: String): Author
        updateAuthor(id: ID, name: String, avatar: String, description: String): Author
        removeAuthor(id: ID): Boolean
        createCategory(name: String, parentID: ID, icon: String): Category
        updateCategory(id: ID, name: String, parentID: ID, icon: String): Category
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