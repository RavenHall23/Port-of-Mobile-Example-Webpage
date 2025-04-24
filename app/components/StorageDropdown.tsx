import React, { useState } from 'react';
import type { WarehouseStatus } from '../../types/database';
import { useTheme } from 'next-themes';

interface StorageDropdownProps {
  warehouseName: string;
  sections: Array<{
    letter: string;
    name: string;
    last_modified?: string;
    updated_at?: string;
  }>;
  onAddSections: (name: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onSectionClick: (letter: string) => void;
  selectedWarehouse: string | null;
}

export const StorageDropdown: React.FC<StorageDropdownProps> = ({
  warehouseName,
  sections,
  onAddSections,
  onDeleteSection,
  onSectionClick,
  selectedWarehouse,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const { theme } = useTheme();

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      onAddSections(newSectionName.trim());
      setNewSectionName('');
      setIsAddingSection(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSection();
    } else if (e.key === 'Escape') {
      setIsAddingSection(false);
      setNewSectionName('');
    }
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-4 backdrop-blur-xl rounded-2xl transition-all duration-300 flex items-center shadow-lg hover:shadow-xl border relative group ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-purple-500/40 from-5% via-blue-500/80 via-50% to-cyan-500/40 to-95% hover:from-purple-400/40 hover:via-blue-400/80 hover:to-cyan-400/40 border-white/20 text-white'
            : 'bg-gradient-to-r from-purple-600/60 from-5% via-blue-600 via-50% to-cyan-600/60 to-95% hover:from-purple-500/60 hover:via-blue-500 hover:to-cyan-500/60 border-white/20 text-white'
        }`}
      >
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r blur-xl group-hover:blur-2xl transition-all duration-500 opacity-30 group-hover:opacity-50 ${
          theme === 'dark'
            ? 'from-purple-400/10 from-5% via-blue-400/30 via-50% to-cyan-400/10 to-95%'
            : 'from-purple-600/10 from-5% via-blue-600/30 via-50% to-cyan-600/10 to-95%'
        }`}></div>
        <div className="flex-1 flex justify-center">
          <span className="text-lg font-semibold text-white/90">{warehouseName}</span>
        </div>
        <div className="absolute right-6">
          <svg
            className={`w-6 h-6 transition-transform duration-300 ${
              isOpen ? 'transform rotate-180' : ''
            } ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-3 backdrop-blur-xl rounded-2xl shadow-2xl border ${
          theme === 'dark'
            ? 'bg-white/10 border-white/10'
            : 'bg-white/60 border-gray-200'
        }`}>
          <div className="p-6">
            <div className="mb-6">
              <h3 className={`text-lg font-semibold mb-4 ${
                theme === 'dark' ? 'text-white/90' : 'text-gray-900'
              }`}>Sections</h3>
              <div className="space-y-3">
                {sections.map((section) => (
                  <div
                    key={section.letter}
                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-sm border ${
                      selectedWarehouse === section.letter
                        ? theme === 'dark'
                          ? 'bg-blue-500/20 shadow-lg border-blue-400/30'
                          : 'bg-blue-100 shadow-lg border-blue-200'
                        : theme === 'dark'
                          ? 'bg-white/5 hover:bg-white/10 border-white/5'
                          : 'bg-white/60 hover:bg-white/70 border-gray-200'
                    }`}
                    onClick={() => onSectionClick(section.letter)}
                  >
                    <span className={`text-base font-medium ${
                      theme === 'dark' ? 'text-white/90' : 'text-gray-900'
                    }`}>
                      {section.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(section.letter);
                      }}
                      className={`p-2 transition-colors rounded-lg ${
                        theme === 'dark'
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                          : 'text-red-600 hover:text-red-500 hover:bg-red-100'
                      }`}
                      title="Delete section"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {isAddingSection ? (
                  <div className={`flex items-center gap-2 p-3 backdrop-blur-sm rounded-xl border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white/60 border-gray-200'
                  }`}>
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Enter section name..."
                      className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        theme === 'dark'
                          ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                      } border`}
                      autoFocus
                    />
                    <button
                      onClick={handleAddSection}
                      disabled={!newSectionName.trim()}
                      className={`px-4 py-2 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm relative group ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-purple-500/40 from-5% via-blue-500/80 via-50% to-cyan-500/40 to-95% hover:from-purple-400/40 hover:via-blue-400/80 hover:to-cyan-400/40 border border-white/20'
                          : 'bg-gradient-to-r from-purple-600/60 from-5% via-blue-600 via-50% to-cyan-600/60 to-95% hover:from-purple-500/60 hover:via-blue-500 hover:to-cyan-500/60 border border-white/20'
                      }`}
                    >
                      <div className={`absolute inset-0 rounded-lg bg-gradient-to-r blur-xl group-hover:blur-2xl transition-all duration-500 opacity-30 group-hover:opacity-50 ${
                        theme === 'dark'
                          ? 'from-purple-400/10 from-5% via-blue-400/30 via-50% to-cyan-400/10 to-95%'
                          : 'from-purple-600/10 from-5% via-blue-600/30 via-50% to-cyan-600/10 to-95%'
                      }`}></div>
                      <span className="relative">Add</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingSection(false);
                        setNewSectionName('');
                      }}
                      className={`px-4 py-2 rounded-lg transition-all duration-300 backdrop-blur-sm ${
                        theme === 'dark'
                          ? 'bg-white/10 text-white/90 hover:bg-white/20'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => setIsAddingSection(true)}
              className={`w-full px-6 py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl backdrop-blur-sm border group relative ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-purple-500/40 from-5% via-blue-500/80 via-50% to-cyan-500/40 to-95% hover:from-purple-400/40 hover:via-blue-400/80 hover:to-cyan-400/40 border-white/20 text-white'
                  : 'bg-gradient-to-r from-purple-600/60 from-5% via-blue-600 via-50% to-cyan-600/60 to-95% hover:from-purple-500/60 hover:via-blue-500 hover:to-cyan-500/60 border-white/20 text-white'
              }`}
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r blur-xl group-hover:blur-2xl transition-all duration-500 opacity-30 group-hover:opacity-50 ${
                theme === 'dark'
                  ? 'from-purple-400/10 from-5% via-blue-400/30 via-50% to-cyan-400/10 to-95%'
                  : 'from-purple-600/10 from-5% via-blue-600/30 via-50% to-cyan-600/10 to-95%'
              }`}></div>
              <svg
                className="w-6 h-6 relative"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="text-base font-semibold relative">Add New Section</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 