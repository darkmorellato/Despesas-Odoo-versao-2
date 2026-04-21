import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagsInputProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export const TagsInput = ({ tags, onTagsChange }: TagsInputProps) => {
  const [newTag, setNewTag] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const tag: Tag = {
      id: Date.now().toString(),
      name: newTag.trim(),
      color: selectedColor
    };

    onTagsChange([...tags, tag]);
    setNewTag('');
    setSelectedColor(COLORS[(tags.length) % COLORS.length]);
  };

  const handleRemoveTag = (id: string) => {
    onTagsChange(tags.filter(tag => tag.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Adicionar tag..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <div className="flex gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                selectedColor === color
                  ? 'border-gray-900 dark:border-white scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <button
          onClick={handleAddTag}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm"
              style={{ backgroundColor: tag.color }}
            >
              <span>{tag.name}</span>
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="hover:opacity-75 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
