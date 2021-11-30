/**
 * ⚡⚡⚡ DECLARAMOS LAS LIBRERIAS y CONSTANTES A USAR! ⚡⚡⚡
 */
require('dotenv').config()
const fs = require('fs');
const express = require('express');
const moment = require('moment');
const ExcelJS = require('exceljs');
const qrcode = require('qrcode-terminal');
const qr = require('qr-image');
const { Client, MessageMedia } = require('whatsapp-web.js');
const mail = require('./mail')
const api = require('./api')
const flow = require('../flow/steps.json')
const messages = require('../flow/messages.json')
const vendors = require('../flow/vendor.json')
const products = require('../flow/products.json')
const app = express();
app.use(express.urlencoded({ extended: true }))
const SESSION_FILE_PATH = `${process.cwd()}/session.json`;
let client;
let sessionData;

/**
 * Enviamos archivos multimedia a nuestro cliente
 * @param {*} number 
 * @param {*} fileName 
 */
const sendMedia = (number, fileName, text = null) => new Promise((resolve, reject) => {
    number = number.replace('@c.us', '');
    number = `${number}@c.us`
    const media = MessageMedia.fromFilePath(`./mediaSend/${fileName}`);
    const msg = client.sendMessage(number, media, { caption: text || null });
    resolve(msg)
})

/**
 * Enviamos un mensaje simple (texto) a nuestro cliente
 * @param {*} number 
 */
const sendMessage = (number = null, text = null) => new Promise((resolve, reject) => {
    number = number.replace('@c.us', '');
    number = `${number}@c.us`
    const message = text;
    const msg = client.sendMessage(number, message);
    console.log(`⚡⚡⚡ Enviando mensajes....`);
    resolve(msg)
})

/**
 * Clear number
 */

const clearNumber = (number) => {
    number = number.replace('@c.us', '');
    number = `${number}`
    return number;
}

/**
 * Revisamos si tenemos credenciales guardadas para inciar sessio
 * este paso evita volver a escanear el QRCODE
 */
const withSession = () => {
    console.log(`Validando session con Whatsapp...`);
    sessionData = require(SESSION_FILE_PATH);
    client = new Client({
        session: sessionData,
        puppeteer: {
            args: [
                '--no-sandbox'
            ],
        }
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        connectionReady();

    });



    client.on('auth_failure', () => {
        console.log('** Error de autentificacion vuelve a generar el QRCODE (Debes Borrar el archivo session.json) **');
    })


    client.initialize();
}

/**
 * Generamos un QRCODE para iniciar sesion
 */
const withOutSession = () => {

    console.log(`🔴🔴 No tenemos session guardada, espera que se generar el QR CODE 🔴🔴`);

    client = new Client({
        puppeteer: {
            args: [
                '--no-sandbox'
            ],
        }
    });
    client.on('qr', qr => {
        qrcode.generate(qr, { small: true });
        generateImage(qr)
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        connectionReady();
    });

    client.on('auth_failure', () => {
        console.log('** Error de autentificacion vuelve a generar el QRCODE **');
    })


    client.on('authenticated', (session) => {
        // Guardamos credenciales de de session para usar luego
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
            if (err) {
                console.log(err);
            }
        });
    });

    client.initialize();
}

const connectionReady = () => {

    /** Aqui escuchamos todos los mensajes que entran */
    client.on('message', async msg => {
        let { body } = msg
        const { from, to } = msg;
        // handleExcel(from)
        let step = await readChat(from, body)
        body = body.toLowerCase();
        /***************************** Preguntas ******************************** */

        if (flow.STEP_1.includes(body)) {

            /**
             * Aqui damos la bienvenida
             */

            console.log('STEP1', body);

            sendMessage(from, messages.STEP_1.join(''))
            return
        }

        if (flow.STEP_2.includes(body)) {

            /**
             * Aqui respondemos los prodcutos
             */
            const step2 = messages.STEP_2.join('')

            const parseLabel = Object.keys(products).map(o => {
                return products[o]['label'];
            }).join('')

            sendMessage(from, step2)
            sendMessage(from, parseLabel)
            await readChat(from, body, 'STEP_2_1')
            return
        }

        if (flow.STEP_3.includes(body)) {
            /**
             * Aqui respondemos los asesores
             */
            const step3 = messages.STEP_3.join('')
            console.log(step3)
            sendMessage(from, step3)
            await readChat(from, body, 'STEP_3_1')
            return
        }

        if (flow.STEP_4.includes(body)) {
            /**
             * Aqui respondemos gracias!
             */
            const step4 = messages.STEP_4.join('')
            console.log(step4)
            sendMessage(from, step4)
            await readChat(from, body)
            return
        }

        if (flow.STEP_5.includes(body)) {
            /**
             * Aqui comenzamos a pedir datos al usuario
             */
            const step5 = messages.STEP_5.join('')
            console.log(step5)
            sendMessage(from, step5)
            await readChat(from, body, 'STEP_5_1')
            return
        }


        /***************************** FLOW ******************************** */

        /* Seguimos el flujo de los productos */
        if (step && step.includes('STEP_2_1')) {

            /**
             * Buscar prodcuto en json
             */
            const insideText = body.toLowerCase();
            const productFind = products[insideText] || null;

            if (productFind) {

                const getAllitems = productFind.main_images;

                const listQueue = getAllitems.map(itemSend => {
                    return sendMedia(
                        from,
                        itemSend.image,
                        itemSend.message.join('')
                    )
                })

                Promise.all(listQueue).then(() => {
                    sendMessage(from, productFind.main_message.join(''))
                })

                const stepProduct = `STEP_2_ITEM_${insideText}`.toUpperCase();
                await readChat(from, body, stepProduct)

            } else {
                sendMessage(from, messages.STEP_2_1.join(''))
                await readChat(from, body, 'STEP_2_1')
            }
            return
        }

        /** Seguimos mostrandole mas imagenes del producto */

        if (step && step.includes('STEP_2_ITEM_')) {

            /**
             * Buscar prodcuto en json pasado en Numero de opción
             */

            let getItem = step.split('STEP_2_ITEM_')
            getItem = getItem.reverse()[0] || null

            const nameItem = getItem.toLowerCase();
            const productFind = products[nameItem] || null;

            if (isNaN(parseInt(body))) {
                sendMessage(from, messages.STEP_2_1.join(''))
                await readChat(from, body)
                return
            }

            const findChild = productFind.list.find(a => parseInt(body) === a.opt)

            /**
             * Revisamos si estamos usando API externa o No
             */
            if (api.checkApi()) {
                sendMessage(from, messages.STEP_2_4.join(''))
            }

            const dataExternal = await api.parseData(findChild);

            /**
             * Si no existe API continuamos con el flujo normal del JSON
             */

            if (findChild) {

                const textProducto = findChild.message.concat(dataExternal)

                const lastImage = findChild.image.pop();

                if (findChild.image.length) {

                    findChild.image.forEach((child) => {
                        sendMedia(
                            from,
                            child
                        )
                    })

                }

                await sendMedia(
                    from,
                    lastImage,
                    textProducto.join('')
                )


                sendMessage(from, messages.STEP_2_3.join(''))

                await readChat(from, body)
            } else {
                sendMessage(from, messages.STEP_2_1.join(''))
                await readChat(from, body)
            }


            return
        }

        /* Seguimos el flujo de los asesores */
        if (step && step.includes('STEP_3_1')) {

            /**
             * Buscar asesor en json
             */
            const insideText = body.toLowerCase();
            const vendorFind = vendors[insideText] || null;

            if (vendorFind) {
                sendMessage(from, vendorFind.join(''))
                await readChat(from, body, 'STEP_4')
            } else {
                sendMessage(from, messages.STEP_3_1.join(''))
                await readChat(from, body)
            }
            return
        }

        /** Seguimos flujo de pedir datos */
        if (step && step.includes('STEP_5_1')) {

            const step5_1 = messages.STEP_5_1.join('')
            console.log(step5_1)
            sendMessage(from, step5_1)
            await readChat(from, body, 'STEP_5_2')
            return
        }

        /** Seguimos flujo de pedir datos el municipio */
        if (step && step.includes('STEP_5_2')) {

            const step5_2 = messages.STEP_5_2.join('')
            console.log(step5_2)
            sendMessage(from, step5_2)
            await readChat(from, body, 'STEP_5_3')
            return
        }

        /** Seguimos flujo de pedir asesor el municipio */
        if (step && step.includes('STEP_5_3')) {

            const step5_3 = messages.STEP_5_3.join('')
            console.log(step5_3)
            sendMessage(from, step5_3)
            await readChat(from, body, 'STEP_5_4')
            return
        }

        /* Seguimos el flujo de los asesores */
        if (step && step.includes('STEP_5_4')) {

            const step5_4 = messages.STEP_5_4.join('')
            const step5_5 = messages.STEP_5_5.join('')
            let messageStep5_4 = step5_4;
            const userName = await handleExcel(from, 'STEP_5_2');
            const userProduct = await handleExcel(from, 'STEP_5_3');
            const userMethodPay = await handleExcel(from, 'STEP_5_4');

            messageStep5_4 = messageStep5_4.replace('%NAME%', userName.value || '')
            messageStep5_4 = messageStep5_4.replace('%LOCATION%', body || '')
            messageStep5_4 = messageStep5_4.replace('%PRODUCT%', userProduct.value || '')
            messageStep5_4 = messageStep5_4.replace('%METHOD%', userMethodPay.value || '')

            sendMessage(from, messageStep5_4)
            sendMessage(from, step5_5)
            await readChat(from, body, 'STEP_5_5')
            return
        }

        if (step && step.includes('STEP_5_5')) {
            if (flow.STEP_5_5.includes(body)) {
                const step5_6 = messages.STEP_5_6.join('')
                sendMessage(from, step5_6)

                const step5_7 = messages.STEP_5_7.join('')
                let messageStep5_7 = step5_7;
                const userName = await handleExcel(from, 'STEP_5_2');
                const userLocation = await handleExcel(from, 'STEP_5_5');
                const userProduct = await handleExcel(from, 'STEP_5_3');
                const userMethodPay = await handleExcel(from, 'STEP_5_4');

                messageStep5_7 = messageStep5_7.replace('%NAME%', userName.value)
                messageStep5_7 = messageStep5_7.replace('%LOCATION%', userLocation.value)
                messageStep5_7 = messageStep5_7.replace('%PRODUCT%', userProduct.value)
                messageStep5_7 = messageStep5_7.replace('%METHOD%', userMethodPay.value)
                messageStep5_7 = messageStep5_7.replace('%USERPHONE%', clearNumber(from))

                mail.sendMail(messageStep5_7)
                await readChat(from, body)
            } else {
                sendMessage(from, messages.ERROR.join(''))
                await readChat(from, body)
            }
            return
        }

        /********************************** DEFAULT************************* */
        sendMessage(from, messages.ERROR.join(''))
        return

    });

}

/**
 * Guardar historial de conversacion
 * @param {*} number 
 * @param {*} message 
 */
const readChat = (number, message, step = null) => new Promise((resolve, reject) => {

    setTimeout(() => {
        number = number.replace('@c.us', '');
        number = `${number}@c.us`
        const pathExcel = `./chats/${number}.xlsx`;
        const workbook = new ExcelJS.Workbook();
        const today = moment().format('DD-MM-YYYY hh:mm')

        if (fs.existsSync(pathExcel)) {
            /**
             * Si existe el archivo de conversacion lo actualizamos
             */
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.readFile(pathExcel)
                .then(() => {
                    const worksheet = workbook.getWorksheet(1);
                    const lastRow = worksheet.lastRow;
                    let getRowInsert = worksheet.getRow(++(lastRow.number));
                    getRowInsert.getCell('A').value = today;
                    getRowInsert.getCell('B').value = message;

                    if (step) {
                        getRowInsert.getCell('C').value = step;
                    }

                    getRowInsert.commit();
                    workbook.xlsx.writeFile(pathExcel)
                        .then(() => {
                            const getRowPrevStep = worksheet.getRow(lastRow.number);
                            const lastStep = getRowPrevStep.getCell('C').value
                            resolve(lastStep)
                        })
                        .catch((err) => {
                            console.log('ERR', err);
                            reject('error')
                        })


                })
                .catch((err) => {
                    console.log('ERR', err);
                    reject('error')
                })

        } else {
            /**
             * NO existe el archivo de conversacion lo creamos
             */
            const worksheet = workbook.addWorksheet('Chats');
            worksheet.columns = [
                { header: 'Fecha', key: 'number_customer' },
                { header: 'Mensajes', key: 'message' },
                { header: 'Paso', key: 'step' },
            ];

            step = step || ''

            worksheet.addRow([today, message, step]);
            workbook.xlsx.writeFile(pathExcel)
                .then(() => {
                    resolve('STEP_1')
                })
                .catch((err) => {
                    console.log('Error', err);
                    reject('error')
                });

        }
    }, 150)

});

const generateImage = (base64) => {
    let qr_svg = qr.image(base64, { type: 'svg', margin: 4 });
    qr_svg.pipe(require('fs').createWriteStream('qr-code.svg'));
    console.log(`⚡ Recuerda que el QR se actualiza cada minuto ⚡'`);
    console.log(`⚡ Actualiza F5 el navegador para mantener el mejor QR⚡`);
    console.log('http://localhost:9000/qr');
}

const handleExcel = (number, step = null) => new Promise((resolve, reject) => {

    const proccessChild = (row) => new Promise((resolve) => {
        const stepFind = row.values[3] || null;
        resolve({
            value: row.values[2] || null,
            step: stepFind
        })
    })

    let rowsList = [];
    setTimeout(() => {
        number = number.replace('@c.us', '');
        number = `${number}@c.us`
        const pathExcel = `./chats/${number}.xlsx`;
        const workbook = new ExcelJS.Workbook();
        if (fs.existsSync(pathExcel)) {
            /**
             * Si existe el archivo de conversacion lo actualizamos
             */

            workbook.xlsx.readFile(pathExcel)
                .then(() => {
                    const worksheet = workbook.getWorksheet(1);
                    worksheet.eachRow((row) => rowsList.push(proccessChild(row)));
                    Promise.all(rowsList).then((listPromise) => {
                        const listRev = listPromise.reverse();
                        if (step) {
                            const findStep = listRev.find((o) => o.step === step);
                            resolve(findStep);
                        } else {
                            reject('error')
                        }

                    })
                    resolve;

                })
                .catch((err) => {
                    console.log('ERR', err);
                    reject('error')
                })
        }

    }, 150)
});


/**
 * Revisamos si existe archivo con credenciales!
 */
(fs.existsSync(SESSION_FILE_PATH)) ? withSession(): withOutSession();

/** QR Link */

app.get('/qr', (req, res) => {
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    fs.createReadStream(`./qr-code.svg`).pipe(res);
})

app.listen(9000, () => {
    console.log('Server ready!');
})