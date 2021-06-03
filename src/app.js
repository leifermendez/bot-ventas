/**
 * ⚡⚡⚡ DECLARAMOS LAS LIBRERIAS y CONSTANTES A USAR! ⚡⚡⚡
 */
require('dotenv').config()
const fs = require('fs');
const express = require('express');
const moment = require('moment');
const ora = require('ora');
const chalk = require('chalk');
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
app.use(express.json())
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
    console.log(`${chalk.red('⚡⚡⚡ Enviando mensajes....')}`);
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
    const spinner = ora(`Cargando ${chalk.yellow('Validando session con Whatsapp...')}`);
    sessionData = require(SESSION_FILE_PATH);
    spinner.start();
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
        spinner.stop();
        connectionReady();

    });



    client.on('auth_failure', () => {
        spinner.stop();
        console.log('** Error de autentificacion vuelve a generar el QRCODE (Debes Borrar el archivo session.json) **');
    })


    client.initialize();
}

/**
 * Generamos un QRCODE para iniciar sesion
 */
const withOutSession = () => {

    console.log(`${chalk.greenBright('🔴🔴 No tenemos session guardada, espera que se generar el QR CODE 🔴🔴')}`);

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
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
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

            sendMessage(from, messages.STEP_1.join(''))
            return
        }


        /***************************** FLOW ******************************** */

        /* Seguimos el flujo de los productos */
        if (step && step.includes('STEP_2_1')) {

            const step2_1 = messages.STEP_2_1.join('')
            console.log(step2_1)
            sendMessage(from, step2_1)
            await readChat(from, body)
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
    console.log(`${chalk.blueBright('⚡ Recuerda que el QR se actualiza cada minuto ⚡')}`);
    console.log(`${chalk.blueBright('⚡ Actualiza F5 el navegador para mantener el mejor QR⚡')}`);
    console.log('http://localhost:9000/qr');
}


const sendMessageApi = (req, res) => {
    const { message, to } = req.body;
    const numberTo = clearNumber(to)
    sendMessage(numberTo, message)
    res.send({ status: 'success' })
}

/**
 * Revisamos si existe archivo con credenciales!
 */
(fs.existsSync(SESSION_FILE_PATH)) ? withSession() : withOutSession();

/** QR Link */

app.get('/qr', (req, res) => {
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    fs.createReadStream(`./qr-code.svg`).pipe(res);
})


/** EndPoint */
app.post('/send-message', sendMessageApi)

app.listen(9000, () => {
    console.log('Server ready!');
})