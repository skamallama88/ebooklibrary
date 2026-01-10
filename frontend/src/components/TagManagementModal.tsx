import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../api';

interface Tag {
  id: number;
  name: string;
  type: string;
  description: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string | null;
  aliases?: string[];
}

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const TAG_TYPES = ['genre', 'theme', 'setting', 'tone', 'structure', 'character_trait', 'meta', 'format'];

const TagManagementModal: React.FC<TagManagementModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [mergingTag, setMergingTag] = useState<Tag | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);

  // Fetch all tags
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  // Filter tags based on search and type
  useEffect(() => {
    let filtered = tags;

    if (searchQuery) {
      filtered = filtered.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tag.aliases || []).some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(tag => tag.type === selectedType);
    }

    setFilteredTags(filtered);
  }, [tags, searchQuery, selectedType]);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/books/tags');
      setTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTag = async (tag: Tag, updates: Partial<Tag>) => {
    try {
      await api.patch(`/tags/${tag.id}`, updates);
      await fetchTags();
      setEditingTag(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update tag:', error);
      alert('Failed to update tag');
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from ${tag.usage_count} book(s).`)) {
      return;
    }

    try {
      await api.delete(`/tags/${tag.id}`);
      await fetchTags();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag');
    }
  };

  const handleMergeTags = async () => {
    if (!mergingTag || !mergeTargetId) return;

    if (!confirm(`Merge "${mergingTag.name}" into the selected tag? All books will be retagged.`)) {
      return;
    }

    try {
      // Use the correct merge endpoint
      await api.post(`/tags/merge-tags/${mergingTag.id}/${mergeTargetId}`);
      await fetchTags();
      setMergingTag(null);
      setMergeTargetId(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to merge tags:', error);
      alert('Failed to merge tags');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tag Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b dark:border-slate-700 space-y-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Types</option>
              {TAG_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing {filteredTags.length} of {tags.length} tags
          </div>
        </div>

        {/* Tag List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">Loading tags...</div>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">No tags found</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map(tag => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  allTags={tags.filter(t => t.id !== tag.id)}
                  isEditing={editingTag?.id === tag.id}
                  isMerging={mergingTag?.id === tag.id}
                  mergeTargetId={mergeTargetId}
                  onEdit={() => setEditingTag(tag)}
                  onCancelEdit={() => setEditingTag(null)}
                  onSaveEdit={(updates) => handleEditTag(tag, updates)}
                  onDelete={() => handleDeleteTag(tag)}
                  onMerge={() => setMergingTag(tag)}
                  onCancelMerge={() => {
                    setMergingTag(null);
                    setMergeTargetId(null);
                  }}
                  onSelectMergeTarget={setMergeTargetId}
                  onConfirmMerge={handleMergeTags}
                  onSwapTags={() => {
                    if (!mergeTargetId) return;
                    const currentTarget = mergeTargetId;
                    setMergeTargetId(tag.id);
                    setMergingTag(tags.find(t => t.id === currentTarget) || null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TagRowProps {
  tag: Tag;
  allTags: Tag[];
  isEditing: boolean;
  isMerging: boolean;
  mergeTargetId: number | null;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updates: Partial<Tag>) => void;
  onDelete: () => void;
  onMerge: () => void;
  onCancelMerge: () => void;
  onSelectMergeTarget: (id: number) => void;
  onConfirmMerge: () => void;
  onSwapTags: () => void;
}

const TagRow: React.FC<TagRowProps> = ({
  tag,
  allTags,
  isEditing,
  isMerging,
  mergeTargetId,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onMerge,
  onCancelMerge,
  onSelectMergeTarget,
  onConfirmMerge,
  onSwapTags,
}) => {
  const [editForm, setEditForm] = useState({
    name: tag.name,
    type: tag.type,
    description: tag.description || '',
  });

  // Alias management state
  const [aliases, setAliases] = useState<any[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [loadingAliases, setLoadingAliases] = useState(false);

  // Fetch aliases when entering edit mode
  useEffect(() => {
    if (isEditing) {
      fetchAliases();
    }
  }, [isEditing]);

  const fetchAliases = async () => {
    setLoadingAliases(true);
    try {
      const res = await api.get(`/tags/${tag.id}/aliases`);
      setAliases(res.data);
    } catch (err) {
      console.error("Failed to fetch aliases", err);
    } finally {
      setLoadingAliases(false);
    }
  };

  const handleAddAlias = async () => {
    if (!newAlias.trim()) return;
    try {
      const res = await api.post(`/tags/${tag.id}/aliases`, {
        alias: newAlias,
        canonical_tag_id: tag.id
      });
      setAliases([...aliases, res.data]);
      setNewAlias('');
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add alias");
    }
  };

  const handleRemoveAlias = async (aliasId: number) => {
    if (!confirm("Remove this alias?")) return;
    try {
      await api.delete(`/tags/aliases/${aliasId}`);
      setAliases(aliases.filter(a => a.id !== aliasId));
    } catch (err) {
      console.error("Failed to remove alias", err);
    }
  };


  const tagTypeColors: Record<string, string> = {
    genre: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    theme: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    setting: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    tone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    structure: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    character_trait: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    meta: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
    format: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  if (isEditing) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tag Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type (select or type custom)
            </label>
            <input
              list="tag-types"
              type="text"
              value={editForm.type}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
              className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              placeholder="Select or enter custom type..."
            />
            <datalist id="tag-types">
              {TAG_TYPES.map(type => (
                <option key={type} value={type} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Common types: {TAG_TYPES.join(', ')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Alias Management Section */}
          <div className="pt-2 border-t dark:border-slate-700">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Aliases
            </label>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                placeholder="Add new alias..."
                className="flex-1 px-3 py-1.5 text-sm border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <button
                onClick={handleAddAlias}
                disabled={!newAlias.trim()}
                className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {loadingAliases ? (
              <div className="text-xs text-slate-500">Loading aliases...</div>
            ) : (
                <div className="flex flex-wrap gap-2">
                  {aliases.map(alias => (
                    <div key={alias.id} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-700 dark:text-slate-300 border dark:border-slate-700">
                      <span>{alias.alias}</span>
                      <button
                        onClick={() => handleRemoveAlias(alias.id)}
                        className="p-0.5 hover:text-red-500 rounded"
                        title="Remove alias"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {aliases.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No aliases defined</span>
                  )}
                </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSaveEdit(editForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isMerging) {
    const targetTag = allTags.find(t => t.id === mergeTargetId);
    
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="space-y-4">
          <div className="font-medium text-slate-900 dark:text-slate-100">
            Merge Tags
          </div>
          
          <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
            {/* Source tag (will be deleted) */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
              <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Will be deleted:</div>
              <div className="font-medium text-slate-900 dark:text-slate-100">{tag.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{tag.usage_count} books</div>
            </div>
            
            {/* Swap button */}
            <button
              onClick={onSwapTags}
              disabled={!mergeTargetId}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              title="Swap tags"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            
            {/* Target tag (will be kept) */}
            <div className={`rounded p-3 border ${mergeTargetId ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              {mergeTargetId && targetTag ? (
                <>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Will be kept:</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{targetTag.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {targetTag.usage_count} books → {targetTag.usage_count + tag.usage_count} books
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Select target below
                </div>
              )}
            </div>
          </div>
          
          <select
            value={mergeTargetId || ''}
            onChange={(e) => onSelectMergeTarget(Number(e.target.value))}
            className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
          >
            <option value="">Select tag to keep...</option>
            {allTags.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.type}) - {t.usage_count} books
              </option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <button
              onClick={onConfirmMerge}
              disabled={!mergeTargetId}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Merge
            </button>
            <button
              onClick={onCancelMerge}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-slate-900 dark:text-slate-100">{tag.name}</span>
            <span className={`px-2 py-0.5 text-xs rounded font-medium ${tagTypeColors[tag.type] || tagTypeColors.meta}`}>
              {tag.type}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {tag.usage_count} {tag.usage_count === 1 ? 'book' : 'books'}
            </span>
          </div>
          {tag.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{tag.description}</p>
          )}
            {(tag.aliases && tag.aliases.length > 0) && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">Aliases:</span>
              {tag.aliases.map(alias => (
                <span key={alias} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {alias}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Edit tag"
          >
            <PencilIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={onMerge}
            className="px-3 py-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50"
            title="Merge tag"
          >
            Merge
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete tag"
          >
            <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagManagementModal;
