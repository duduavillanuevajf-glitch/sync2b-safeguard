import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vaultService } from '@/services/vault.service'
import type { VaultItem } from '@/types'

export function useVaultItems(params?: { search?: string; service?: string; page?: number }) {
  return useQuery({
    queryKey: ['vault', params],
    queryFn: () => vaultService.list(params),
  })
}

export function useVaultItem(id: string) {
  return useQuery({
    queryKey: ['vault', id],
    queryFn: () => vaultService.get(id),
    enabled: !!id,
  })
}

export function useCreateVaultItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<VaultItem>) => vaultService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  })
}

export function useUpdateVaultItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VaultItem> }) => vaultService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  })
}

export function useDeleteVaultItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => vaultService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault'] }),
  })
}
