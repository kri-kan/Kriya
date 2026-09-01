import React, { useState, useEffect } from 'react';
import { X, Check, Trash2 } from 'lucide-react';
import { CustomList } from '../types';
import { LIST_COLORS, AVAILABLE_ICONS, LIST_ICONS_MAP, getListColor, getListIcon } from '../utils/listUtils';

interface CustomListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string, color: string) => void;
  onDelete?: (id: string) => void;
  initialList?: CustomList | null;
}

export const CustomListModal: React.FC<CustomListModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialList = null,
}) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('List');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (initialList) {
      setName(initialList.name);
      setSelectedIcon(initialList.icon || 'List');
      setSelectedColor(initialList.color || 'blue');
    } else {
      setName('');
      setSelectedIcon('List');
      setSelectedColor('blue');
    }
    setConfirmDelete(false);
  }, [initialList, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), selectedIcon, selectedColor);
    onClose();
  };

  const currentColorObj = getListColor(selectedColor);
  const CurrentIconComp = getListIcon(selectedIcon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentColorObj.accentBg} shadow-xs`}>
              <CurrentIconComp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {initialList ? 'Edit List' : 'Create New List'}
              </h3>
              <p className="text-xs text-slate-500">Group tasks by project or category</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* List Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              List Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work Projects, Groceries, Travel"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Color Palette Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
              {LIST_COLORS.map((col) => {
                const isSelected = selectedColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedColor(col.id)}
                    className={`
                      h-8 rounded-lg flex items-center justify-center transition-all relative
                      ${isSelected ? 'ring-2 ring-offset-2 ring-slate-800 scale-105' : 'hover:scale-105 opacity-85 hover:opacity-100'}
                    `}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              List Icon
            </label>
            <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-100 rounded-xl">
              {AVAILABLE_ICONS.map((iconKey) => {
                const IconComponent = LIST_ICONS_MAP[iconKey];
                const isSelected = selectedIcon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setSelectedIcon(iconKey)}
                    className={`
                      p-2 rounded-lg flex items-center justify-center transition-colors
                      ${
                        isSelected
                          ? `${currentColorObj.accentBg} shadow-xs font-bold`
                          : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }
                    `}
                    title={iconKey}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {initialList && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-rose-600 font-semibold">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(initialList.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
                  >
                    Delete List
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete List
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                {initialList ? 'Save Changes' : 'Create List'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
