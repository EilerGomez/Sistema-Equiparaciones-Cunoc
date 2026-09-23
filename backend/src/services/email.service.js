const nodemailer = require('nodemailer');

const createTransporter = () =>
   nodemailer.createTransport({
    host:   process.env.MAIL_HOST,
    port:   Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    },
  });

const sendPasswordResetEmail = async ({ to, nombre, resetToken }) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to,
    subject: 'Recuperación de contraseña — Equivalencias',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
        <h2 style="color: #1d4ed8;">Recuperar contraseña</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>El enlace es válido por <strong>${process.env.PASSWORD_RESET_EXPIRES_MINUTES || 10} minutos</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background:#1d4ed8; color:#fff; padding:12px 28px;
                    border-radius:6px; text-decoration:none; font-size:15px;">
            Restablecer contraseña
          </a>
        </div>
        <p style="color:#6b7280; font-size:13px;">
          Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
        </p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin: 24px 0;">
        <p style="color:#9ca3af; font-size:12px;">Sistema de Equivalencias</p>
      </div>
    `,
  });
};


const sendScraperResultEmail = async ({ to, nombre, resumen, error }) => {
  const transporter = createTransporter()

  if (error) {
    await transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to,
      subject: '⚠ Error en carga de docentes — Equivalencias',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
          <h2 style="color: #b83232;">Error en la carga</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Ocurrió un error durante el proceso de carga de docentes:</p>
          <pre style="background:#fee2e2;padding:12px;border-radius:6px;font-size:13px;">${error}</pre>
          <p style="color:#6b7280;font-size:13px;">Por favor intenta nuevamente o contacta al administrador.</p>
        </div>
      `,
    })
    return
  }

  const { pensum, anio, cursosProcessados, docentesInsertados, relacionesInsertadas, relacionesOmitidas, duracionSegundos } = resumen

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to,
    subject: 'Carga de docentes completada — Equivalencias',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
        <h2 style="color: #1d4ed8;">Carga completada</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>El proceso de carga de docentes ha finalizado. Por favor verifica los resultados con cuidado.</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr style="background:#f0ece4;">
            <td style="padding:10px;border:1px solid #e4ddd0;font-weight:bold;">Pensum</td>
            <td style="padding:10px;border:1px solid #e4ddd0;">${pensum}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #e4ddd0;font-weight:bold;">Año del ciclo</td>
            <td style="padding:10px;border:1px solid #e4ddd0;">${anio}</td>
          </tr>
          <tr style="background:#f0ece4;">
            <td style="padding:10px;border:1px solid #e4ddd0;font-weight:bold;">Cursos procesados</td>
            <td style="padding:10px;border:1px solid #e4ddd0;">${cursosProcessados}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #e4ddd0;font-weight:bold;">Docentes insertados</td>
            <td style="padding:10px;border:1px solid #e4ddd0;">${docentesInsertados}</td>
          </tr>
          <tr style="background:#f0ece4;">
            <td style="padding:10px;border:1px solid #e4ddd0;font-weight:bold;">Asignaciones insertadas</td>
            <td style="padding:10px;border:1px solid #e4ddd0;">${relacionesInsertadas}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #e4ddd0;font-weight:bold;">Asignaciones omitidas (ya existían)</td>
            <td style="padding:10px;border:1px solid #e4ddd0;">${relacionesOmitidas}</td>
          </tr>
          <tr style="background:#f0ece4;">
            <td style="padding:10px;border:1px solid #e4ddd0;font-weight:bold;">Duración</td>
            <td style="padding:10px;border:1px solid #e4ddd0;">${duracionSegundos} segundos</td>
          </tr>
        </table>

        <p style="color:#6b7280;font-size:13px;">
          Te recomendamos revisar la sección de Docentes y Docente/Curso para verificar que los datos sean correctos.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;">Sistema de Equivalencias</p>
      </div>
    `,
  })
}

module.exports = { sendPasswordResetEmail, sendScraperResultEmail }
