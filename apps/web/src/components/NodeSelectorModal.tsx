import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Badge } from '~/components/ui/badge'

interface Node {
  id: string
  name: string
  tag?: string | null
  protocol?: string | null
  address?: string | null
  subscriptionID?: string | null
}

interface Subscription {
  id: string
  tag?: string | null
}

interface NodeSelectorModalProps {
  open: boolean
  onClose: () => void
  allNodes: Node[]
  selectedNodeIds: string[]
  allSubscriptions?: Subscription[]
  onConfirm: (selectedIds: string[]) => void
}

export function NodeSelectorModal({
  open,
  onClose,
  allNodes,
  selectedNodeIds,
  allSubscriptions,
  onConfirm,
}: NodeSelectorModalProps) {
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState('')
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedNodeIds)

  // Update temp selection when modal opens with new selectedNodeIds
  useMemo(() => {
    if (open) {
      setTempSelectedIds(selectedNodeIds)
    }
  }, [open, selectedNodeIds])

  // Filter nodes by search text
  const filteredNodes = useMemo(() => {
    if (!searchText.trim()) {
      return allNodes
    }
    const searchLower = searchText.toLowerCase()
    return allNodes.filter((node) => {
      const displayName = node.tag || node.name
      const subscriptionTag = node.subscriptionID
        ? allSubscriptions?.find((s) => s.id === node.subscriptionID)?.tag
        : ''
      return (
        displayName.toLowerCase().includes(searchLower) ||
        node.address?.toLowerCase().includes(searchLower) ||
        subscriptionTag?.toLowerCase().includes(searchLower)
      )
    })
  }, [allNodes, searchText, allSubscriptions])

  const handleToggle = (nodeId: string) => {
    setTempSelectedIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
    )
  }

  const handleConfirm = () => {
    onConfirm(tempSelectedIds)
    onClose()
    setSearchText('')
  }

  const handleCancel = () => {
    onClose()
    setSearchText('')
    setTempSelectedIds(selectedNodeIds)
  }

  const handleSelectAll = () => {
    setTempSelectedIds(filteredNodes.map((node) => node.id))
  }

  const handleDeselectAll = () => {
    setTempSelectedIds([])
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('actions.addNodes', '添加节点到组')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search.nodeName', '搜索节点名称...')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Batch Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('selected', '已选择')}: {tempSelectedIds.length} / {allNodes.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {t('actions.selectAll', '全选')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                {t('actions.deselectAll', '取消全选')}
              </Button>
            </div>
          </div>

          {/* Node List */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-4 space-y-2">
              {filteredNodes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {searchText ? t('noResults', '无匹配结果') : t('empty', '无节点')}
                </div>
              ) : (
                filteredNodes.map((node) => {
                  const isSelected = tempSelectedIds.includes(node.id)
                  const displayName = node.tag || node.name
                  const subscriptionTag = node.subscriptionID
                    ? allSubscriptions?.find((s) => s.id === node.subscriptionID)?.tag
                    : null

                  return (
                    <div
                      key={node.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleToggle(node.id)}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => handleToggle(node.id)} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{displayName}</span>
                          {node.protocol && (
                            <Badge variant="secondary" className="text-xs">
                              {node.protocol}
                            </Badge>
                          )}
                          {subscriptionTag && (
                            <Badge variant="outline" className="text-xs">
                              {subscriptionTag}
                            </Badge>
                          )}
                        </div>
                        {node.address && (
                          <div className="text-xs text-muted-foreground truncate mt-1">{node.address}</div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('actions.cancel', '取消')}
          </Button>
          <Button onClick={handleConfirm}>{t('actions.confirm', '确认')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
