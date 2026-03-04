import React, { useState, useEffect } from 'react';
import { CarCompany } from '../types';
import { carCompanies } from '../mocks/data';

interface CarCompanySelectorProps {
  onCompanyChange: (selectedCompanies: CarCompany[]) => void;
  initialSelectedCompanies?: CarCompany[];
}

const CarCompanySelector: React.FC<CarCompanySelectorProps> = ({
  onCompanyChange,
  initialSelectedCompanies = carCompanies
}) => {
  const [selectedCompanies, setSelectedCompanies] = useState<CarCompany[]>(initialSelectedCompanies);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    onCompanyChange(selectedCompanies);
  }, [selectedCompanies, onCompanyChange]);

  const toggleCompany = (company: CarCompany) => {
    setSelectedCompanies(prev => {
      const isSelected = prev.some(c => c.id === company.id);
      if (isSelected) {
        // 至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(c => c.id !== company.id);
        }
        return prev;
      } else {
        return [...prev, company];
      }
    });
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const selectAll = () => {
    setSelectedCompanies(carCompanies);
  };

  const clearAll = () => {
    // 确保至少保留一个选中项
    if (carCompanies.length > 0) {
      setSelectedCompanies([carCompanies[0]]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          选择车企 ({selectedCompanies.length}/{carCompanies.length})
        </span>
        <span className={`text-sm transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
          <i className="fa-solid fa-chevron-down"></i>
        </span>
      </button>

       {isDropdownOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              全选
            </button>
            <button
              onClick={clearAll}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              清除
            </button>
          </div>
          <div className="p-2">
            {carCompanies.map(company => (
              <label
                key={company.id}
                className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCompanies.some(c => c.id === company.id)}
                  onChange={() => toggleCompany(company)}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  disabled={selectedCompanies.length === 1 && selectedCompanies[0].id === company.id}
                />
                <div className="ml-3 flex items-center">
                 {/* 不显示公司logo，直接使用占位元素 */}
                 <div 
                   className="w-6 h-6 rounded-full mr-2 flex items-center justify-center"
                   style={{ backgroundColor: company.color }}
                 >
                   <span className="text-white text-xs">{company.name[0]}</span>
                 </div>
                  {!company.logo && (
                    <div 
                      className="w-6 h-6 rounded-full mr-2 flex items-center justify-center"
                      style={{ backgroundColor: company.color }}
                    >
                      <span className="text-white text-xs">{company.name[0]}</span>
                    </div>
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{company.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarCompanySelector;