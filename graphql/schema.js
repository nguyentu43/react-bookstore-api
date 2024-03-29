const { buildSchema } = require("graphql");

const schema = buildSchema(`

    type User {
        id: ID!
        name: String!
        email: String!
        isAdmin: Boolean!
        createdAt: String
    }

    type Author{
        id: ID!
        name: String!
        avatar: String
        description: String
        books: Int
    }

    type Category{
        id: ID!
        name: String!
        children: [Category]
        icon: String
        parent: Category
    }

    type Rating{
        id: ID!
        title: String!
        comment: String!
        user: User!
        rate: Int!
        createdAt: String!
        updatedAt: String!
    }

    type Product {
        id: ID!
        name: String!
        price: Float!
        discount: Float
        description: String
        slug: String!
        images: [Image]
        authors: [Author]
        ratings: [Rating]
        category: Category
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
        images: [Image]
    }

    type Order{
        id: ID!
        name: String!
        status: String!
        address: String!
        phone: String!
        total: Float!
        createdAt: String!
        updatedAt: String!
        user: User
        paymentID: String
        items: [ProductItem!]
    }
    
    scalar Upload

    type Image{
        public_id: String!
        secure_url: String!
    }

    type ImageList{
        list: [Image]
        next_cursor: String
    }

    input UserData{
        name: String!
        email: String!
        password: String
        isAdmin: Boolean
    }

    input RegisterData{
        name: String!
        email: String!
        password: String!
    }

    input ProductData{
        name: String!
        price: Float!
        discount: Float!
        description: String
        images: String
        authors: [ID]
        category: ID
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
        items: [OrderItemData]!
        paymentID: String
        phone: String!
        total: Float!
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

    input RatingData{
        title: String
        comment: String
        rate: Int
    }

    type Query {
        login(email: String!, password: String!): String!
        loginWithProvider(email: String!, name:String!): String!
        getImages(cursor: String): ImageList
        getCategories: [Category]!
        getAuthors: [Author]!
        getProduct(slug: String!): Product
        getRecommendationProducts(offset:Int, limit:Int):[Product]!
        getProducts(search: String, offset: Int, limit: Int): [Product]!
        getPaymentCode(total: Int!, currency: String): String!
        getUserInfo: User!
        getUserCart: [ProductItem!]
        getUserOrders: [Order]!
        getWishlist: [Product]
        getOrders: [Order]!
        getUsers: [User]!
        getDashboardData(year: Int): String!
    }

    type Mutation{
        register(input: RegisterData!): String!
        addUser(input: UserData!): User!
        updateUser(id: ID!, input: UserData!): User!
        removeUser(id: ID!): Boolean
        requestResetPassword(email: String!): String
        verifyTokenAndResetPassword(token: String!, password: String!): String
        addAuthor(input: AuthorData): Author
        updateAuthor(id: ID, input: AuthorData): Author
        removeAuthor(id: ID): Boolean
        addCategory(input: CategoryData): Category
        updateCategory(id: ID, input: CategoryData): Category
        removeCategory(id: ID): Boolean
        addProduct(input: ProductData!): Product!
        updateProduct(id: ID!, input: ProductData!): Product!
        removeProduct(id: ID!): Boolean!
        addCartItem(input: CartItemData!): [ProductItem!]
        removeCartItem(productID: ID!): [ProductItem!]
        checkout(input:OrderData!): Order!
        addOrder(input: OrderData!, userID: ID): Order!
        updateOrder(id: ID!, input: OrderData!, userID: ID): Order!
        removeOrder(id: ID!): Boolean!
        uploadImages(files: [Upload!], urls: String): [Image]
        removeImages(public_ids: [String!]): Boolean
        addWishlist(id: ID): Boolean
        removeWishlist(id: ID): Boolean
        addRating(input: RatingData, userID: ID!, productID: ID!): Rating
        updateRating(input: RatingData, userID: ID!, id: ID!): Rating
        removeRating(id: ID!): Boolean
        refundStripe(paymentID: String!): Boolean
    }
`);

module.exports = schema;
