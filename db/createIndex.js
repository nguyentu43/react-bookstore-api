module.exports = async function(sequelize){

    const [result, metadata] = await sequelize.query(`CREATE INDEX product_name_fts ON "Products" USING GIN (to_tsvector('english', name));`);

}