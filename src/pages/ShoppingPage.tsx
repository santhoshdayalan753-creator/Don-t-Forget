import React, { useState } from 'react';
import { 
  Plus, 
  ShoppingBag, 
  Trash2, 
  Check, 
  PlusCircle, 
  Archive, 
  Package, 
  ShoppingCart,
  ChevronRight
} from 'lucide-react';
import { useMemories } from '../context/MemoryContext';

export const ShoppingPage: React.FC = () => {
  const { 
    shoppingLists, 
    shoppingItems, 
    addShoppingList, 
    deleteShoppingList, 
    addShoppingItem, 
    toggleShoppingItemBought, 
    deleteShoppingItem 
  } = useMemories();

  const [activeListId, setActiveListId] = useState<string>(shoppingLists[0]?.id || '');
  const [newListName, setNewListName] = useState('');
  const [showNewListModal, setShowNewListModal] = useState(false);

  // New item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('');

  // Synchronize active list if current deleted
  const currentList = shoppingLists.find(l => l.id === activeListId) || shoppingLists[0];
  const activeItems = shoppingItems.filter(i => i.list_id === currentList?.id);
  const remainingCount = activeItems.filter(i => !i.is_bought).length;
  const boughtCount = activeItems.filter(i => i.is_bought).length;

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = await addShoppingList(newListName.trim());
    setActiveListId(created.id);
    setNewListName('');
    setShowNewListModal(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !currentList) return;
    await addShoppingItem(currentList.id, newItemName.trim(), newQuantity, newUnit);
    setNewItemName('');
    setNewQuantity('1');
    setNewUnit('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-blue-500" />
            <span>Shopping Lists</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize supermarket groceries, hardware, and supplies with clean checklists.
          </p>
        </div>

        <button
          onClick={() => setShowNewListModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Shopping List</span>
        </button>
      </div>

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Shopping List</h3>
            <form onSubmit={handleCreateList} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="List name (e.g. Costco, Home Depot, Pharmacy)"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newListName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Container: Lists Switcher & Items Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column: Lists selection */}
        <div className="md:col-span-1 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            Your Lists ({shoppingLists.length})
          </span>
          <div className="space-y-1">
            {shoppingLists.map((list) => {
              const isActive = (currentList?.id === list.id);
              const count = shoppingItems.filter(i => i.list_id === list.id && !i.is_bought).length;
              return (
                <button
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between text-left transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{list.title}</span>
                  </div>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected List Items */}
        <div className="md:col-span-3 space-y-4">
          {currentList ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
              {/* List Title Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentList.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {remainingCount} items remaining • {boughtCount} completed
                  </p>
                </div>

                {shoppingLists.length > 1 && (
                  <button
                    onClick={() => deleteShoppingList(currentList.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-xs flex items-center gap-1"
                    title="Delete entire list"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete list</span>
                  </button>
                )}
              </div>

              {/* Add item inline bar */}
              <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Add item (e.g. Olive Oil, 2% Milk, Screws)..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Qty (e.g. 2)"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Unit (pack/kg)"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newItemName.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Items List */}
              <div className="space-y-2 pt-2">
                {activeItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Package className="w-8 h-8 mx-auto stroke-1" />
                    <p className="text-xs">This shopping list is currently empty.</p>
                  </div>
                ) : (
                  activeItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        item.is_bought
                          ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 opacity-60'
                          : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleShoppingItemBought(item.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            item.is_bought
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                          }`}
                        >
                          {item.is_bought && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <span className={`text-xs font-medium block truncate ${
                            item.is_bought ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'
                          }`}>
                            {item.item_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {(item.quantity || item.unit) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {item.quantity} {item.unit}
                          </span>
                        )}
                        <button
                          onClick={() => deleteShoppingItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">No lists available</p>
              <button
                onClick={() => setShowNewListModal(true)}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl"
              >
                Create your first list
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
