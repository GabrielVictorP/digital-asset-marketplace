// Hook para gerenciar dados do perfil do usuário incluindo endereço
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

export interface UserAddress {
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  phone_number?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

export const useUserProfile = () => {
  const { user } = useSupabaseAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // First, try to get from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileData) {
        // Convert profiles data to UserProfile format
        const userProfile: UserProfile = {
          id: profileData.id,
          user_id: profileData.id, // in profiles, id is the user_id
          email: profileData.email || user.email || '',
          full_name: profileData.full_name,
          phone_number: profileData.phone_number,
          address_line1: undefined,
          address_line2: undefined,
          city: undefined,
          state: undefined,
          postal_code: undefined,
          country: undefined
        }
        setProfile(userProfile)
      } else {
        // If not found in profiles, try users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (userData) {
          setProfile(userData)
        } else if (userError && userError.code === 'PGRST116') {
          // User not found in either table, create one in users
          const newProfile = {
            user_id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            phone_number: null,
            user_type: 'customer'
          }

          const { data: created, error: createError } = await supabase
            .from('users')
            .insert(newProfile)
            .select()
            .single()

          if (createError) {
            throw createError
          }

          setProfile(created)
        } else if (userError) {
          throw userError
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }, [user])

  const updateAddress = useCallback(async (addressData: UserAddress) => {
    if (!user || !profile) return { success: false, error: 'Usuário não encontrado' }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('users')
        .update(addressData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setProfile(data)
      return { success: true, data }
    } catch (err) {
      console.error('Error updating address:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar endereço'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  const hasCompleteAddress = useCallback(() => {
    return !!(
      profile?.address_line1 &&
      profile?.city &&
      profile?.state &&
      profile?.postal_code
    )
  }, [profile])

  const getFormattedAddress = useCallback(() => {
    if (!profile) return ''
    
    const parts = [
      profile.address_line1,
      profile.address_line2,
      profile.city,
      profile.state,
      profile.postal_code
    ].filter(Boolean)
    
    return parts.join(', ')
  }, [profile])

  // Carregar perfil quando usuário logado
  useEffect(() => {
    if (user) {
      loadProfile()
    } else {
      setProfile(null)
    }
  }, [user, loadProfile])

  return {
    profile,
    loading,
    error,
    loadProfile,
    updateAddress,
    hasCompleteAddress,
    getFormattedAddress
  }
}
