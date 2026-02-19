import { supabase } from '@/integrations/supabase/client';
import { GameAccount } from '@/types/accounts';

/**
 * Serviço de e-mail usando Supabase Edge Functions
 * Substitui o nodemailer que não funciona no frontend
 */

// Interface para dados do produto comprado
interface PurchaseData {
  itemName: string;
  itemId: string;
  buyerEmail: string;
  buyerName?: string;
  paymentAmount: number;
  paymentMethod: string;
  orderId?: string;
}

/**
 * Serviço principal para envio de e-mails via Edge Function
 */
export class EmailServiceEdgeFunction {
  /**
   * Envia e-mail com credenciais de jogo após pagamento aprovado via PIX
   */
  static async sendGameCredentials(
    purchaseData: PurchaseData, 
    gameAccount: GameAccount
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'send_credentials',
          purchaseData,
          gameAccount
        }
      });

      if (error) {
        console.error('Error calling Edge Function:', error);
        return false;
      }

      console.log('Email sent via Edge Function:', data);
      return data?.success || false;
    } catch (error) {
      console.error('Error sending email via Edge Function:', error);
      return false;
    }
  }

  /**
   * Testa a configuração de e-mail SMTP
   */
  static async testEmailConfiguration(): Promise<boolean> {
    try {
      // Teste real tentando enviar email para o próprio admin
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'test_email',
          testEmail: 'support@example.com' // Teste enviando para o próprio admin
        }
      });

      if (error) {
        console.error('Gmail SMTP configuration error:', error);
        return false;
      }

      // Verifica se o envio foi bem sucedido
      const success = data?.success || false;
      if (success) {
        console.log('Gmail SMTP configuration is working!');
      } else {
        console.error('Gmail SMTP test failed:', data?.message);
      }
      
      return success;
    } catch (error) {
      console.error('Gmail SMTP configuration error:', error);
      return false;
    }
  }

  /**
   * Envia e-mail de teste
   */
  static async sendTestEmail(recipientEmail: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'test_email',
          testEmail: recipientEmail
        }
      });

      if (error) {
        console.error('Error sending test email:', error);
        return false;
      }

      console.log('Test email sent via Edge Function:', data);
      return data?.success || false;
    } catch (error) {
      console.error('Error sending test email:', error);
      return false;
    }
  }

  /**
   * Processa pagamento PIX aprovado e envia e-mail automaticamente
   */
  static async processPixPayment(paymentData: {
    orderId: string;
    itemId: string;
    itemName: string;
    buyerEmail: string;
    buyerName?: string;
    paymentAmount: number;
    paymentId: string;
  }): Promise<{
    success: boolean;
    emailSent: boolean;
    message: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'process_pix_payment',
          paymentData
        }
      });

      if (error) {
        console.error('Error processing PIX payment:', error);
        return {
          success: false,
          emailSent: false,
          message: 'Erro ao processar pagamento PIX'
        };
      }

      return {
        success: data?.success || false,
        emailSent: data?.emailSent || false,
        message: data?.message || 'Processamento concluído'
      };
    } catch (error) {
      console.error('Error in processPixPayment:', error);
      return {
        success: false,
        emailSent: false,
        message: 'Erro interno no processamento'
      };
    }
  }

  /**
   * Envia e-mail com credenciais para pagamento PIX aprovado
   */
  static async sendPixCredentials(orderData: any, accountData: any): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'send_pix_credentials',
          orderData,
          accountData
        }
      });

      if (error) {
        console.error('Error sending PIX credentials:', error);
        return false;
      }

      console.log('PIX credentials email sent:', data);
      return data?.success || false;
    } catch (error) {
      console.error('Error sending PIX credentials email:', error);
      return false;
    }
  }

  /**
   * Envia e-mail de confirmação para pagamento com cartão aprovado
   */
  static async sendCardConfirmation(orderData: any): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'send_card_confirmation',
          orderData
        }
      });

      if (error) {
        console.error('Error sending card confirmation:', error);
        return false;
      }

      console.log('Card confirmation email sent:', data);
      return data?.success || false;
    } catch (error) {
      console.error('Error sending card confirmation email:', error);
      return false;
    }
  }

  /**
   * Processa pagamento com cartão de crédito e envia credenciais (manual ou automático)
   */
  static async processCreditCardPayment(paymentData: {
    orderId: string;
    itemId: string;
    itemName: string;
    buyerEmail: string;
    buyerName?: string;
    paymentAmount: number;
    paymentId: string;
    gameEmail: string;
    gamePassword: string;
    gameToken?: string;
    itemImage?: string;
    isManualSend?: boolean;
  }): Promise<{
    success: boolean;
    emailSent: boolean;
    message: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'process_credit_card_payment',
          paymentData
        }
      });

      if (error) {
        console.error('Error processing credit card payment:', error);
        return {
          success: false,
          emailSent: false,
          message: 'Erro ao processar pagamento com cartão'
        };
      }

      return {
        success: data?.success || false,
        emailSent: data?.emailSent || false,
        message: data?.message || 'Processamento concluído'
      };
    } catch (error) {
      console.error('Error in processCreditCardPayment:', error);
      return {
        success: false,
        emailSent: false,
        message: 'Erro interno no processamento'
      };
    }
  }

  /**
   * Busca templates de email do banco de dados
   */
  static async getEmailTemplates(): Promise<{
    success: boolean;
    templates?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'get_email_templates'
        }
      });

      if (error) {
        console.error('Error getting email templates:', error);
        return {
          success: false,
          error: 'Erro ao buscar templates'
        };
      }

      return {
        success: data?.success || false,
        templates: data?.templates,
        error: data?.error
      };
    } catch (error) {
      console.error('Error in getEmailTemplates:', error);
      return {
        success: false,
        error: 'Erro interno ao buscar templates'
      };
    }
  }

  /**
   * Salva template de email no banco de dados
   */
  static async saveEmailTemplate(templateName: string, templateData: {
    subject: string;
    welcomeMessage: string;
    instructionsMessage: string;
    footerMessage: string;
    supportMessage: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'save_email_template',
          templateName,
          templateData
        }
      });

      if (error) {
        console.error('Error saving email template:', error);
        return {
          success: false,
          error: 'Erro ao salvar template'
        };
      }

      return {
        success: data?.success || false,
        error: data?.error
      };
    } catch (error) {
      console.error('Error in saveEmailTemplate:', error);
      return {
        success: false,
        error: 'Erro interno ao salvar template'
      };
    }
  }
}

export default EmailServiceEdgeFunction;
