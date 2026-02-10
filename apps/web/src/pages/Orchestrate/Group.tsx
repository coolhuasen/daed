import type { GroupFormModalRef } from '~/components/GroupFormModal'
import type { DraggingResource } from '~/constants'
import type { GroupsQuery } from '~/schemas/gql/graphql'
import { useStore } from '@nanostores/react'
import { Settings2, Table2 } from 'lucide-react'

import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useGroupDelNodesMutation,
  useGroupDelSubscriptionsMutation,
  useGroupsQuery,
  useRemoveGroupMutation,
  useRenameGroupMutation,
  useSubscriptionsQuery,
  useGroupAddNodesMutation,
  useNodesQuery,
} from '~/apis'
import { DroppableGroupCard } from '~/components/DroppableGroupCard'
import { GroupFormModal } from '~/components/GroupFormModal'
import { Section } from '~/components/Section'
import { SortableGroupContent } from '~/components/SortableGroupContent'
import { NodeSelectorModal } from '~/components/NodeSelectorModal'
import { Button } from '~/components/ui/button'
import { SimpleTooltip } from '~/components/ui/tooltip'
import { DraggableResourceType } from '~/constants'
import { useDisclosure } from '~/hooks'
import { defaultResourcesAtom } from '~/store'

export function GroupResource({
  highlight,
  draggingResource,
}: {
  highlight?: boolean
  draggingResource?: DraggingResource | null
}) {
  const { t } = useTranslation()
  const { data: groupsQuery } = useGroupsQuery()
  const { data: nodesQuery } = useNodesQuery()
  const { defaultGroupID } = useStore(defaultResourcesAtom)
  const [openedCreateGroupFormModal, { open: openCreateGroupFormModal, close: closeCreateGroupFormModal }] =
    useDisclosure(false)
  const [openedUpdateGroupFormModal, { open: openUpdateGroupFormModal, close: closeUpdateGroupFormModal }] =
    useDisclosure(false)
  const [nodeSelectorGroupId, setNodeSelectorGroupId] = useState<string | null>(null)
  const removeGroupMutation = useRemoveGroupMutation()
  const renameGroupMutation = useRenameGroupMutation()
  const groupDelNodesMutation = useGroupDelNodesMutation()
  const groupDelSubscriptionsMutation = useGroupDelSubscriptionsMutation()
  const groupAddNodesMutation = useGroupAddNodesMutation()
  const updateGroupFormModalRef = useRef<GroupFormModalRef>(null)
  const { data: subscriptionsQuery } = useSubscriptionsQuery()

  // NOTE: 构建 nodeId → subscriptionId 映射，用于在弹窗中显示节点的订阅来源
  const nodeSubscriptionMap = useMemo(() => {
    const map = new Map<string, string>()
    if (subscriptionsQuery?.subscriptions) {
      for (const sub of subscriptionsQuery.subscriptions) {
        if (sub.nodes?.edges) {
          for (const node of sub.nodes.edges) {
            map.set(node.id, sub.id)
          }
        }
      }
    }
    return map
  }, [subscriptionsQuery])

  // NOTE: 合并所有节点并注入 subscriptionID，用于 NodeSelectorModal
  const allNodesWithSubscription = useMemo(() => {
    const edges = nodesQuery?.nodes.edges || []
    return edges.map((node) => ({
      ...node,
      subscriptionID: nodeSubscriptionMap.get(node.id) || null,
    }))
  }, [nodesQuery?.nodes.edges, nodeSubscriptionMap])

  // Determine which accordion sections should be auto-expanded based on drag type
  const autoExpandValue = useMemo(() => {
    if (!draggingResource) return undefined

    const { type } = draggingResource
    if (
      type === DraggableResourceType.node ||
      type === DraggableResourceType.groupNode ||
      type === DraggableResourceType.subscription_node
    ) {
      return 'node'
    }
    if (type === DraggableResourceType.subscription || type === DraggableResourceType.groupSubscription) {
      return 'subscription'
    }
    return undefined
  }, [draggingResource])

  const handleOpenNodeSelector = (groupId: string) => {
    setNodeSelectorGroupId(groupId)
  }

  const handleCloseNodeSelector = () => {
    setNodeSelectorGroupId(null)
  }

  const handleConfirmNodeSelection = (groupId: string, currentNodeIds: string[], newSelectedIds: string[]) => {
    const currentIdSet = new Set(currentNodeIds)
    const newIdSet = new Set(newSelectedIds)

    // Find nodes to add (in new but not in current)
    const nodesToAdd = newSelectedIds.filter((id) => !currentIdSet.has(id))

    // Find nodes to remove (in current but not in new)
    const nodesToRemove = currentNodeIds.filter((id) => !newIdSet.has(id))

    // Execute mutations
    if (nodesToAdd.length > 0) {
      groupAddNodesMutation.mutate({
        id: groupId,
        nodeIDs: nodesToAdd,
      })
    }

    if (nodesToRemove.length > 0) {
      groupDelNodesMutation.mutate({
        id: groupId,
        nodeIDs: nodesToRemove,
      })
    }
  }

  return (
    <Section
      title={t('group')}
      icon={<Table2 className="h-5 w-5" />}
      onCreate={openCreateGroupFormModal}
      highlight={highlight}
      bordered
    >
      {groupsQuery?.groups.map(
        ({
          id: groupId,
          name,
          policy,
          nodes: groupNodes,
          subscriptions: groupSubscriptions,
        }: GroupsQuery['groups'][number]) => (
          <DroppableGroupCard
            key={groupId}
            id={groupId}
            name={name}
            onRemove={defaultGroupID !== groupId ? () => removeGroupMutation.mutate(groupId) : undefined}
            onRename={(newName) => renameGroupMutation.mutate({ id: groupId, name: newName })}
            actions={
              <SimpleTooltip label={t('actions.settings')}>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    updateGroupFormModalRef.current?.setEditingID(groupId)

                    updateGroupFormModalRef.current?.initOrigins({
                      name,
                      policy,
                    })

                    openUpdateGroupFormModal()
                  }}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            }
          >
            <p className="text-sm font-semibold">{policy}</p>

            <div className="h-2.5" />

            <SortableGroupContent
              groupId={groupId}
              nodes={groupNodes}
              subscriptions={groupSubscriptions}
              allSubscriptions={subscriptionsQuery?.subscriptions}
              autoExpandValue={autoExpandValue}
              onDelNode={(nodeId) =>
                groupDelNodesMutation.mutate({
                  id: groupId,
                  nodeIDs: [nodeId],
                })
              }
              onDelSubscription={(subscriptionId) =>
                groupDelSubscriptionsMutation.mutate({
                  id: groupId,
                  subscriptionIDs: [subscriptionId],
                })
              }
              onAddNodesClick={() => handleOpenNodeSelector(groupId)}
            />
          </DroppableGroupCard>
        ),
      )}

      <GroupFormModal opened={openedCreateGroupFormModal} onClose={closeCreateGroupFormModal} />
      <GroupFormModal
        ref={updateGroupFormModalRef}
        opened={openedUpdateGroupFormModal}
        onClose={closeUpdateGroupFormModal}
      />

      {/* Node Selector Modal */}
      {nodeSelectorGroupId && (
        <NodeSelectorModal
          open={true}
          onClose={handleCloseNodeSelector}
          allNodes={allNodesWithSubscription}
          selectedNodeIds={
            groupsQuery?.groups.find((g) => g.id === nodeSelectorGroupId)?.nodes.map((n) => n.id) || []
          }
          allSubscriptions={subscriptionsQuery?.subscriptions}
          onConfirm={(selectedIds) => {
            const currentNodeIds =
              groupsQuery?.groups.find((g) => g.id === nodeSelectorGroupId)?.nodes.map((n) => n.id) || []
            handleConfirmNodeSelection(nodeSelectorGroupId, currentNodeIds, selectedIds)
          }}
        />
      )}
    </Section>
  )
}
