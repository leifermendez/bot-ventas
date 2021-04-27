__Antes de iniciar__

[Ver Video](https://www.youtube.com/watch?v=iCSVcEq17rA)

Lo primero que debes hacer es asegurarte de tener instalado NODE.

> Debes de tener instalado NODE si no sabes como instalarlo te dejo un video en el cual explico como instalar node https://www.youtube.com/watch?v=6741ceWzsKQ&list=PL_WGMLcL4jzVY1y-SutA3N_PCNCAG7Y46&index=2&t=50s Minuto 0:50

__Instalacion__
Debes instalar los paquetes necesarios
```
npm install
``` 

Luego debes de escanear el codigo QR puedes hacerlo escaneando en la terminal o en el navegador
http://localhost:9000/qr

Una vez escaneado y vinculada tu cuenta de Whatsapp puedes empezara  probar el BOT

__Steps__
En los archivos ` .json` donde se encuentran las palabras claves deben estar en __minuscula__ no importa si el usuario la escribe en otro 
formato ya que el script se encarga de interpretarlas en minusculas.

__Envio de MAIL__
Debes te crear un archivo llamado `.env` el cual debe de tener las siguientes variables
```
MAIL_PORT=465
MAIL_SMTP=smtp.gmail.com
MAIL_USER=tumail@gmail.com
MAIL_PASS=TU_CONTRASEÑA_GENERADA
MAIL_CLIENT=email_donde_quieres_recibir@mail.com
MAIL_FROM=tumail@gmail.com
MAIL_SUBJECT=Cliente interesado
MAIL_TRANSPORT=smtp
```

__Formatos de Mensaje__
`\n` Salto de linea
`*PALABRA*` Negrito
`_PALABRA_` Cursiva

__Instalacion en Ubuntu__
``` 
npm install pm2 -g
sudo apt-get install -y libgbm-dev
sudo apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```