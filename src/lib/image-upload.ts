import { supabase } from '@/integrations/supabase/client'

/**
 * Faz upload de uma imagem para o bucket product-images do Supabase Storage
 * @param file - O arquivo de imagem para upload
 * @param folder - Pasta opcional no bucket (ex: 'logo', 'items')
 * @returns URL pública da imagem ou null em caso de erro
 */
export async function uploadImageToStorage(
  file: File,
  folder?: string
): Promise<string | null> {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomSuffix}.${fileExtension}`
    
    // Definir caminho no storage
    const storagePath = folder ? `${folder}/${fileName}` : fileName
    
    // Fazer upload
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Erro no upload da imagem:', error)
      return null
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error)
    return null
  }
}

/**
 * Remove uma imagem do Supabase Storage baseada na URL
 * @param imageUrl - URL completa da imagem no Supabase Storage
 * @returns boolean indicando sucesso ou falha
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<boolean> {
  try {
    // Extrair o caminho do arquivo da URL
    const baseUrl = 'https://yeepurhkkwftpwxowyzb.supabase.co/storage/v1/object/public/product-images/'
    if (!imageUrl.startsWith(baseUrl)) {
      console.warn('URL da imagem não pertence ao bucket product-images')
      return false
    }
    
    const filePath = imageUrl.replace(baseUrl, '')
    
    // Deletar arquivo
    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])

    if (error) {
      console.error('Erro ao deletar imagem:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    return false
  }
}

/**
 * Valida se o arquivo é uma imagem válida
 * @param file - Arquivo para validar
 * @returns boolean indicando se é válido
 */
export function validateImageFile(file: File): boolean {
  // Tipos permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  
  // Tamanho máximo: 5MB
  const maxSize = 5 * 1024 * 1024
  
  if (!allowedTypes.includes(file.type)) {
    return false
  }
  
  if (file.size > maxSize) {
    return false
  }
  
  return true
}

/**
 * Converte uma URL de imagem para uma versão otimizada (se disponível)
 * @param imageUrl - URL original da imagem
 * @param width - Largura desejada (opcional)
 * @param height - Altura desejada (opcional)
 * @returns URL otimizada da imagem
 */
export function getOptimizedImageUrl(
  imageUrl: string, 
  width?: number, 
  height?: number
): string {
  // Por enquanto, retorna a URL original
  // No futuro, pode implementar transformações de imagem do Supabase
  return imageUrl
}

/**
 * Cria um nome de arquivo limpo baseado no nome do item
 * @param itemName - Nome do item
 * @returns Nome de arquivo sanitizado
 */
export function createImageFileName(itemName: string): string {
  // Limpar caracteres especiais e espaços
  const cleanName = itemName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50) // Limitar tamanho
  
  const timestamp = Date.now()
  return `${cleanName}_${timestamp}`
}
