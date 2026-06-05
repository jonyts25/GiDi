// ¡NUEVO! Le decimos al bot que vaya a buscar la contraseña a la carpeta de tu API
require('dotenv').config({ path: '../api/.env' }); 

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { PrismaClient } = require('@prisma/client'); // ¡NUEVO! Importamos Prisma

const prisma = new PrismaClient(); // Iniciamos la conexión a la base de datos
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('📱 ¡QR Generado! Escanéalo en WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ ¡Bot de GiDi conectado a WhatsApp y a Supabase!');
});

client.on('message', async (msg) => {
    // ¡NUEVO FILTRO! Ignorar los estados de WhatsApp
    if (msg.from === 'status@broadcast') return;
    
    const numero = msg.from;
    const texto = msg.body.toLowerCase();

    console.log(`Mensaje de ${numero}: ${texto}`);

    if (texto.includes('hola') || texto.includes('info')) {
        await msg.reply('¡Hola! Soy el asistente virtual de GiDi 🤖.\n\n¿Qué necesitas hacer hoy?\n1️⃣ Agendar una cita\n2️⃣ Hablar con un humano');
    } 
    else if (texto === '1') {
        await msg.reply('Perfecto. Estoy registrando tu solicitud en el sistema...');
        
        // ¡NUEVO! Magia de Prisma: Guardamos en la base de datos
        try {
            await prisma.appointmentRequest.create({
                data: {
                    parentPhone: numero,
                    rawMessage: "El usuario solicitó agenda mediante el bot (Opción 1)",
                    status: "pending"
                }
            });
            await msg.reply('✅ Tu solicitud ha sido registrada con éxito en nuestra base de datos. La recepción la revisará y te confirmará el horario.');
        } catch (error) {
            console.error("❌ Error guardando en Supabase:", error);
            await msg.reply('Ups, hubo un problema conectando con el sistema. Intenta de nuevo en unos minutos.');
        }
    }
    else if (texto === '2') {
        await msg.reply('Entendido. He pausado mis respuestas automáticas. En un momento te atiende recepción.');
    }
});

client.initialize();