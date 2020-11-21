const { buildSchema } = require("graphql");

const schema = buildSchema(`

    type User {
        id: ID!
        name: String!
        email: String!
        isAdmin: Boolean!
        createAt: String!
        updatedAt: String!
    }

    type UserInfo{
        id: ID!
        name: String!
        isAdmin: Boolean!
    }

    type Product {
        id: ID!
        name: String!
        price: Int!
        discount: Float
        description: String
        createdAt: String!
        updatedAt: String!
        slug: String!
        coverImage: String
        previewImages: [String!]
        attributes: [ProductAttribute]
    }

    type ProductAttribute{
        id: ID!
        name: String!
        value: String!
    }

    type ProductItem{
        id: ID!
        name: String!
        price: Int!
        slug: String!
        discount: Float!
        quantity: Int!
    }

    type Category{
        id: ID!
        name: String!
        values: [String]!
    }

    type Order{
        id: ID!
        name: String!
        status: String!
        address: String!
        totalPrice: Int!
        createdAt: String!
        updatedAt: String!
        userID: ID!
        items: [ProductItem]!
    }

    type Cart{
        items: [ProductItem]!
    }

    type Error{
        messsage: String!
        status: Int!
    }

    input UserData{
        name: String!
        email: String!
        password: String!
    }

    input ProductAttributeData{
        id: ID!
        value: String!
    }

    input ProductData{
        name: String!
        price: Int!
        discount: Float!
        description: String
        coverImage: String
        previewImages: [String!]
        attributes: [ProductAttributeData]
    }

    input CartItemData{
        quantity: Int!
        productID: ID!
    }

    input OrderItemData{
        quantity: Int!
        price: Int!
        discount: Float!
        productID: ID!
    }

    input OrderData{
        name: String!
        address: String!
        status: String!
        totalPrice: Int!
        items: [OrderItemData]!
    }

    type RootQuery {
        login(email: String!, password: String!): String!
        getCategories(name: String): [Category]! 
        getProduct(slug: String!): Product
        getProducts: [Product]!
        getUserInfo: UserInfo!
        getUserCart: Cart!
        getUserOrders: [Order]!
        getOrders: [Order]!
    }

    type RootMutation{
        register(input: UserData): String!
        createUser(input: UserData!): User!
        createProduct(input: ProductData!): Product!
        updateProduct(id: ID!, input: ProductData!): Product!
        deleteProduct(id: ID!): Boolean!
        addCartItem(input: CartItemData): Boolean!
        removeCartItem(productID: ID!): Boolean!
        checkout(input: OrderData): Order!
        addOrder(input: OrderData): Order!
        updateOrder(id: ID!, input: OrderData): Order!
        updateOrderStatus(id: ID!, status: String!): Order!
        removeOrder(id: ID!): Boolean!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);

module.exports = schema;