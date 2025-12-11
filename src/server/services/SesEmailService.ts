import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { logError, logInfo } from '@/src/lib/logging/log.util';

const region = process.env.AWS_SES_REGION;
const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
const fromAddress = process.env.HARMONET_MAIL_FROM;

let sesClient: SESv2Client | null = null;

const getSesClient = (): SESv2Client => {
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS SES credentials or region are not configured.');
  }

  if (!sesClient) {
    sesClient = new SESv2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return sesClient;
};

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

export const sendEmail = async ({ to, subject, text }: SendEmailParams): Promise<void> => {
  if (!fromAddress) {
    logError('email.ses.misconfigured', {
      reason: 'HARMONET_MAIL_FROM is not set',
    });
    throw new Error('Email sender address is not configured.');
  }

  const client = getSesClient();

  try {
    const command = new SendEmailCommand({
      FromEmailAddress: fromAddress,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          },
        },
      },
    });

    const response = await client.send(command);

    logInfo('email.ses.send_success', {
      to,
      messageId: response.MessageId ?? null,
    });
  } catch (error) {
    logError('email.ses.send_failed', {
      to,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
