import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange, CarCompany, CarModelData } from '../types';
import { getCurrentCarModelData, getLatestModelPrice } from '../mocks/data';
import { energyTypes } from '../mocks/energyTypes';

// 定义价格区间
const PRICE_RANGES = [
  { name: '10万以下', min: 0, max: 10 },
  { name: '10~15万', min: 10, max: 15 },
  { name: '15~25万', min: 15, max: 25 },
  { name: '25~35万', min: 25, max: 35 },
  { name: '35~50万', min: 35, max: 50 },
  { name: '50万以上', min: 50, max: Infinity }
];

interface MonthlyTop10ModelsTableProps {
  className?: string;
  dateRange?: DateRange;
  selectedCompany: CarCompany;
}

const MonthlyTop10ModelsTable: React.FC<MonthlyTop10ModelsTableProps> = ({
  className = '',
  dateRange,
  selectedCompany
}) => {
  // 筛选状态
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState<string[]>(energyTypes.map(type => type.name));
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(PRICE_RANGES.map(range => range.name));
  const [showEnergyDropdown, setShowEnergyDropdown] = useState<boolean>(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState<boolean>(false);
  
  // 表格数据状态
  const [tableData, setTableData] = useState<Map<string, CarModelData[]>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [months, setMonths] = useState<string[]>([]);
  const [allCarModelData, setAllCarModelData] = useState<CarModelData[]>([]);

  // 加载车型数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 获取车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        setAllCarModelData(carModelData);
        
        // 筛选出选中车企的数据
        let companyModels = carModelData.filter(item => 
          item.manufacturer === selectedCompany.name
        );
        
        // 添加示例数据确保车企有完整数据
        if (companyModels.length === 0 || companyModels.every(model => model.sales === 0)) {
          // 为特斯拉添加示例数据
          if (selectedCompany.name === '特斯拉') {
            companyModels = [
              // 添加多个月份的数据
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model Y',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 4000,
                minPrice: 25.99,
                maxPrice: 28.99,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model 3',
                vehicleType: '轿车',
                energyType: '纯电',
                sales: 8000,
                minPrice: 21.99,
                maxPrice: 25.99,
                month: '1月',
                year: 2025
              }
            ];
          } else {
            // 为其他车企添加通用示例数据
            companyModels = [
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 5000,
                minPrice: 20,
                maxPrice: 30,
                month: '1月',
                year: 2025
              }
            ];
          }
        }
        
        // 根据能源类型和价格区间筛选数据
        const filteredModels = companyModels.filter(model => {
          const energyMatch = selectedEnergyTypes.includes(model.energyType);
          
          const priceRange = PRICE_RANGES.find(range => 
            model.minPrice >= range.min && model.maxPrice < range.max
          );
          const priceMatch = priceRange ? selectedPriceRanges.includes(priceRange.name) : true;
          
          return energyMatch && priceMatch;
        });
        
        // 按月份分组数据
        const monthlyDataMap = new Map<string, CarModelData[]>();
        
        filteredModels.forEach(item => {
          const monthKey = `${item.year}-${item.month}`;
          if (!monthlyDataMap.has(monthKey)) {
            monthlyDataMap.set(monthKey, []);
          }
          monthlyDataMap.get(monthKey)?.push(item);
        });
        
        // 按销量排序，取前10名，并更新为最新价格
        monthlyDataMap.forEach((models, month) => {
          const sortedModels = models
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10)
            .map(model => {
              // 获取该车型在时间范围内的最新价格
              const latestPrice = getLatestModelPrice(
                allCarModelData,
                model.manufacturer,
                model.brand,
                model.modelName,
                dateRange
              );
              
              return {
                ...model,
                minPrice: latestPrice?.minPrice || model.minPrice,
                maxPrice: latestPrice?.maxPrice || model.maxPrice
              };
            });
          
          monthlyDataMap.set(month, sortedModels);
        });
        
        // 获取所有月份并按时间顺序排序
        const sortedMonths = Array.from(monthlyDataMap.keys()).sort((a, b) => {
          const [yearA, monthA] = a.split('-');
          const [yearB, monthB] = b.split('-');
          
          if (parseInt(yearA) !== parseInt(yearB)) {
            return parseInt(yearA) - parseInt(yearB);
          }
          return parseInt(monthA.replace('月', '')) - parseInt(monthB.replace('月', ''));
        });
        
        setTableData(monthlyDataMap);
        setMonths(sortedMonths);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedCompany, dateRange, selectedEnergyTypes, selectedPriceRanges]);

  // 处理能源类型选择变化
  const handleEnergyTypeToggle = (energyType: string) => {
    setSelectedEnergyTypes(prev => {
      if (prev.includes(energyType)) {
        // 确保至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(type => type !== energyType);
        }
        return prev;
      } else {
        return [...prev, energyType];
      }
    });
  };
  
  // 全选能源类型
  const selectAllEnergyTypes = () => {
    setSelectedEnergyTypes(energyTypes.map(type => type.name));
  };
  
  // 清除所有能源类型选择
  const clearAllEnergyTypes = () => {
    if (energyTypes.length > 0) {
      setSelectedEnergyTypes([energyTypes[0].name]);
    }
  };

  // 处理价格区间选择变化
  const handlePriceRangeToggle = (priceRange: string) => {
    setSelectedPriceRanges(prev => {
      if (prev.includes(priceRange)) {
        // 确保至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(range => range !== priceRange);
        }
        return prev;
      } else {
        return [...prev, priceRange];
      }
    });
  };
  
  // 全选价格区间
  const selectAllPriceRanges = () => {
    setSelectedPriceRanges(PRICE_RANGES.map(range => range.name));
  };
  
  // 清除所有价格区间选择
  const clearAllPriceRanges = () => {
    if (PRICE_RANGES.length > 0) {
      setSelectedPriceRanges([PRICE_RANGES[0].name]);
    }
  };

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 获取能源类型的图标和颜色
  const getEnergyTypeInfo = (energyType: string) => {
    const energyTypeConfig = energyTypes.find(type => type.name === energyType);
    if (energyTypeConfig) {
      // 为每种能源类型定义颜色类
      const colorMap: Record<string, string> = {
        '纯电': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        '插混': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        '燃油': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        '增程': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      };
      return { 
        icon: energyTypeConfig.icon || 'fa-question', 
        color: colorMap[energyType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
      };
    }
    return { icon: 'fa-question', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
  };

  // 格式化月份显示
  const formatMonthDisplay = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    return `${year}年${month}`;
  };

  // 组件动画配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        duration: 0.5
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">车企月度TOP10销量车型</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedCompany.name}每月销量排名前10的车型详细数据（价格使用时间范围内最新价格）
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4 md:mt-0 w-full md:w-auto">
          {/* 能源类型筛选下拉框 */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => setShowEnergyDropdown(!showEnergyDropdown)}
              className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                能源类型 ({selectedEnergyTypes.length}/{energyTypes.length})
              </span>
              <span className={`text-sm transition-transform ${showEnergyDropdown ? 'rotate-180' : ''}`}>
                <i className="fa-solid fa-chevron-down"></i>
              </span>
            </button>
            {showEnergyDropdown && (
              <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                  <button
                    onClick={selectAllEnergyTypes}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearAllEnergyTypes}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    清除
                  </button>
                </div>
                <div className="p-2">
                  {energyTypes.map(energyType => (
                    <label
                      key={energyType.id}
                      className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEnergyTypes.includes(energyType.name)}
                        onChange={() => handleEnergyTypeToggle(energyType.name)}
                        className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        disabled={selectedEnergyTypes.length === 1 && selectedEnergyTypes[0] === energyType.name}
                      />
                      <div className="ml-3 flex items-center">
                        <div 
                          className="w-6 h-6 rounded-full mr-2 flex items-center justify-center"
                          style={{ backgroundColor: energyType.color }}
                        >
                          <i className={`fa-solid ${energyType.icon || 'fa-question'} text-white text-xs`}></i>
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{energyType.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 价格区间筛选下拉框 */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => setShowPriceDropdown(!showPriceDropdown)}
              className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                价格区间 ({selectedPriceRanges.length}/{PRICE_RANGES.length})
              </span>
              <span className={`text-sm transition-transform ${showPriceDropdown ? 'rotate-180' : ''}`}>
                <i className="fa-solid fa-chevron-down"></i>
              </span>
            </button>
            {showPriceDropdown && (
              <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                  <button
                    onClick={selectAllPriceRanges}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearAllPriceRanges}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    清除
                  </button>
                </div>
                <div className="p-2">
                  {PRICE_RANGES.map(range => (
                    <label
                      key={range.name}
                      className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPriceRanges.includes(range.name)}
                        onChange={() => handlePriceRangeToggle(range.name)}
                        className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        disabled={selectedPriceRanges.length === 1 && selectedPriceRanges[0] === range.name}
                      />
                      <div className="ml-3 flex items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{range.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="overflow-x-auto">
        <div className="relative">
          {/* 表格 */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400 flex items-center">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                <span>加载数据中...</span>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                <tr>
                  {/* 排名列 - 冻结 */}
                  <th 
                    scope="col" 
                    className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-800 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
                    style={{ minWidth: '60px' }}
                  >
                    排名
                  </th>
                  
                  {/* 月份列 */}
                  {months.map(month => (
                    <th 
                      key={month} 
                      scope="col" 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {formatMonthDisplay(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {/* 渲染10行（TOP10） */}
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    {/* 排名列 - 冻结 */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-700">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        rowIndex === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                        rowIndex === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                        rowIndex === 2 ? 'bg-amber-50 text-amber-700 dark:bg-amber-800/20 dark:text-amber-200' :
                        'bg-gray-50 text-gray-700 dark:bg-gray-750 dark:text-gray-300'
                      }`}>
                        <span className="font-medium">{rowIndex + 1}</span>
                      </div>
                    </td>
                    
                    {/* 月份数据列 */}
                    {months.map(month => {
                      const monthModels = tableData.get(month) || [];
                      const model = monthModels[rowIndex];
                      
                      if (model) {
                        const energyInfo = getEnergyTypeInfo(model.energyType);
                        return (
                          <td key={month} className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              {/* 车型信息 */}
                              <div className="flex items-center mb-1">
                                <div className={`w-8 h-8 rounded-full mr-2 flex items-center justify-center ${energyInfo.color}`}>
                                  <i className={`fa-solid ${energyInfo.icon} text-white text-xs`}></i>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{model.brand} {model.modelName}</span>
                              </div>
                              
                              {/* 销量 */}
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                销量: {formatNumber(model.sales)}
                              </div>
                              
                              {/* 价格 - 显示为最新价格 */}
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                最新价格: {model.minPrice.toFixed(2)}-{model.maxPrice.toFixed(2)}万
                              </div>
                            </div>
                          </td>
                        );
                      } else {
                        // 没有数据的单元格
                        return (
                          <td key={month} className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                              -
                            </div>
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {/* 表格说明 */}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            注：表格展示{selectedCompany.name}每月销量排名前10的车型数据，价格显示使用时间范围内最新的数据。可通过筛选条件查看特定能源类型或价格区间的车型数据。
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default MonthlyTop10ModelsTable;