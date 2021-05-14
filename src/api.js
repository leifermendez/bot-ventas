const axios = require('axios')
const apiLabel = require('../flow/api.json')

const url = process.env.EXTERNAL_API || null;

const getProductFrom = async (id) => {
    try {
        /**
         * En este punto nos conectamos a la API externa y pedimos los productos 
         * basados en el ID de categoria
         */
        const response = await axios.get(`${url}/${id}`)
        console.log(response);
        return response.data
    } catch (e) {
        console.error(e);
    }
}

const checkApi = () => {
    return url
}

const parseData = async (findChild) => {
    try {
        if (checkApi() && findChild && findChild.external_category_id) {
            const idCategory = findChild.external_category_id;
            const productsById = await getProductFrom(idCategory);
            console.log('---->', productsById);


            /**
             * Esta parte deberia existir un endpint para pedir info del producto
             * individual pero como no esta hacemos esto
             */

            const parseData = (Array.isArray(productsById)) ? productsById : [];

            const single = parseData.find(i => i.Id === findChild.external_product_id);

            return [
                `${apiLabel.name} ${single.NombreProducto} \n`,
                `${apiLabel.description} ${single.Descripcion} \n`,
                [
                    `${[apiLabel.precio_a]}: ${single.PrecioInicial} `,
                    `${[apiLabel.precio_b]}: ${single.PrecioCredito} `,
                    `${[apiLabel.precio_c]}: ${single.PrecioVenta} `,
                    `${[apiLabel.precio_d]}: ${single.PrecioCrediContado} `
                ].join('\n')
            ]
        } else {
            return [];
        }
    } catch (e) {
        console.log(`ERROR`, e);
        return [];
    }
}

module.exports = { getProductFrom, checkApi, parseData }