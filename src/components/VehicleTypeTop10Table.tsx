import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange, CarModelData } from '../types';
import { getCurrentCarModelData, formatMonthWithYear, getLatestModelPrice } from '../mocks/data';

interface VehicleTypeTop10TableProps {
  className?: string;
  dateRange?: DateRange;
}

// 表格行数据类型
interface TableRowData {
  modelName: string; // 品牌+车型
  fullModelName: string; // 完整的车型名称
  brand: string;
  manufacturer: string;
  minPrice: number;
  maxPrice: number;
  // 保存每个月份的销量数据和排名
  [monthName: string]: number | string;
  [monthNameWithRank: string]: number | string; // 用于存储带排名的数据，如 "2025.01-rank"
}

const VehicleTypeTop10Table: React.FC<VehicleTypeTop10TableProps> = ({
  className = '',
  dateRange
}) => {
  // 从数据中获取所有车辆类型
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [monthlyRankings, setMonthlyRankings] = useState<Record<string, string[]>>({}); // 存储每个月的车型排名
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [months, setMonths] = useState<string[]>([]);
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState<boolean>(false);

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        // 获取所有车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 获取所有唯一的车辆类型
        const allVehicleTypes = Array.from(new Set(
          carModelData.map(model => model.vehicleType)
        )).filter(type => type !== '未知');
        
        // 初始化选中第一个车辆类型
        if (allVehicleTypes.length > 0 && !selectedVehicleType) {
          setSelectedVehicleType(allVehicleTypes[0]);
        }
        
        setVehicleTypes(allVehicleTypes);
        
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };
    
    loadData();
  }, [dateRange, selectedVehicleType]);

  // 当选中的车辆类型变化时，加载对应的车型数据
  useEffect(() => {
    if (!selectedVehicleType) return;

    const loadVehicleTypeData = () => {
      setIsLoading(true);
      try {
        // 获取所有车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 筛选出选中车辆类型的数据
        const filteredModels = carModelData.filter(model => 
          model.vehicleType === selectedVehicleType && model.sales > 0
        );
        
        // 获取所有唯一的月份并排序
        const allMonths = Array.from(new Set(
          filteredModels.map(model => formatMonthWithYear(model.month, model.year))
        )).sort();
        
        // 按月份存储每个月的车型销量
        const monthlyModelSales = new Map<string, Map<string, {sales: number, minPrice: number, maxPrice: number, brand: string, manufacturer: string}>>();
        
        // 初始化每个月的数据结构
        allMonths.forEach(month => {
          monthlyModelSales.set(month, new Map());
        });
        
        // 收集每个月每个车型的销量数据
        filteredModels.forEach(item => {
          const formattedMonth = formatMonthWithYear(item.month, item.year);
          const modelKey = `${item.brand} ${item.modelName}`;
          
          if (monthlyModelSales.has(formattedMonth)) {
            const monthMap = monthlyModelSales.get(formattedMonth)!;
            if (!monthMap.has(modelKey)) {
              monthMap.set(modelKey, {
                sales: 0,
                minPrice: item.minPrice,
                maxPrice: item.maxPrice,
                brand: item.brand,
                manufacturer: item.manufacturer
              });
            }
            const modelData = monthMap.get(modelKey)!;
            modelData.sales += item.sales;
          }
        });
        
        // 存储每个月的车型排名
        const monthlyRankings: Record<string, string[]> = {};
        // 存储所有出现在任何月份TOP10的车型
        const allTopModels = new Set<string>();
        
        // 对每个月的车型按销量单独排序，并记录排名
        allMonths.forEach(month => {
          const monthMap = monthlyModelSales.get(month)!;
          // 转换为数组并按销量降序排序
          const sortedModels = Array.from(monthMap.entries())
            .map(([modelKey, data]) => ({
              modelKey,
              sales: data.sales
            }))
            .filter(model => model.sales > 0) // 过滤掉销量为0的车型
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10); // 取前10名
            
          // 保存排名
          monthlyRankings[month] = sortedModels.map(model => model.modelKey);
          
          // 将所有TOP10车型添加到集合中
          sortedModels.forEach(model => allTopModels.add(model.modelKey));
        });
        
        // 构建表格数据
        const tableData: TableRowData[] = [];
        // 为每个TOP10车型创建一行数据
        allTopModels.forEach(modelKey => {
          // 从任意一个月中获取车型的品牌和价格信息
          let brand = '';
          let manufacturer = '';
          let minPrice = 0;
          let maxPrice = 0;
          
          // 查找包含该车型的任意一个月
          for (const month of allMonths) {
            const monthMap = monthlyModelSales.get(month)!;
            if (monthMap.has(modelKey)) {
              const modelData = monthMap.get(modelKey)!;
              brand = modelData.brand;
              manufacturer = modelData.manufacturer;
              minPrice = modelData.minPrice;
              maxPrice = modelData.maxPrice;
              break;
            }
          }
          
          const row: any = {
            modelName: modelKey,
            fullModelName: modelKey,
            brand: brand,
            manufacturer: manufacturer,
            minPrice: minPrice,
            maxPrice: maxPrice
          };
          
          // 为每个月添加销量数据和排名
          allMonths.forEach(month => {
            const monthMap = monthlyModelSales.get(month)!;
            const modelData = monthMap.get(modelKey);
            
            if (modelData) {
              row[month] = modelData.sales;
              // 计算排名
              const rank = monthlyRankings[month].indexOf(modelKey) + 1;
              row[`${month}-rank`] = rank;
            } else {
              row[month] = 0;
              row[`${month}-rank`] = 0; // 表示不在该月的TOP10中
            }
          });
          
          tableData.push(row);
        });
        
        setTableData(tableData);
        setMonths(allMonths);
        setMonthlyRankings(monthlyRankings);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVehicleTypeData();
  }, [selectedVehicleType, dateRange]);

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    if (num === 0) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 获取车辆类型的图标和颜色
  const getVehicleTypeInfo = (vehicleType: string) => {
    // 为每种车辆类型定义颜色类
    const colorMap: Record<string, string> = {
      'SUV': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      '轿车': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      '小型车': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      '豪华SUV': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    };

    // 为每种车辆类型定义图标
    const iconMap: Record<string, string> = {
      'SUV': 'fa-truck',
      '轿车': 'fa-car',
      '小型车': 'fa-car-side',
      '豪华SUV': 'fa-car-rear'
    };
    
    return { 
      icon: iconMap[vehicleType] || 'fa-question', 
      color: colorMap[vehicleType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
    };
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">车辆类型区分销量TOP10</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            按车辆类型筛选，每个月份单独按销量排名前10的车型数据
          </p>
        </div>
        
         {/* 车辆类型选择下拉框 */}
        <div className="relative w-full md:w-auto min-w-[180px] mt-4 md:mt-0">
          {vehicleTypes.length > 0 && (
            <>
              <button
                onClick={() => setShowVehicleTypeDropdown(!showVehicleTypeDropdown)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center`} style={{ backgroundColor: getVehicleTypeInfo(selectedVehicleType).color.split(' ')[0].replace('bg-', '') }}>
                    <i className={`fa-solid ${getVehicleTypeInfo(selectedVehicleType).icon} text-white text-xs`}></i>
                  </div>
                  {selectedVehicleType}
                </span>
                <span className={`text-sm transition-transform ${showVehicleTypeDropdown ? 'rotate-180' : ''}`}>
                  <i className="fa-solid fa-chevron-down"></i>
                </span>
              </button>
              {showVehicleTypeDropdown && (
                <div className="absolute z-50 mt-2 w-full min-w-[180px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    {vehicleTypes.map(vehicleType => (
                      <label
                        key={vehicleType}
                        className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="vehicleType"
                          checked={selectedVehicleType === vehicleType}
                          onChange={() => {
                            setSelectedVehicleType(vehicleType);
                            setShowVehicleTypeDropdown(false);
                          }}
                          className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex items-center">
                          <div 
                            className="w-6 h-6 rounded-full mr-2 flex items-center justify-center"
                            style={{ backgroundColor: getVehicleTypeInfo(vehicleType).color.split(' ')[0].replace('bg-', '') }}
                          >
                            <i className={`fa-solid ${getVehicleTypeInfo(vehicleType).icon} text-white text-xs`}></i>
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{vehicleType}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400 flex items-center">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              <span>加载数据中...</span>
            </div>
          </div>
        ) : months.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
              <tr>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  style={{ minWidth: '60px' }}
                >
                  排名
                </th>
                {months.map((month) => (
                  <th 
                    key={month} 
                    scope="col" 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    style={{ minWidth: '120px' }}
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* 为每个月渲染10行数据 */}
              {Array.from({ length: 10 }).map((_, rowIndex) => (
                <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                  {/* 排名列 */}
                  <td className="px-4 py-4 whitespace-nowrap">
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
                    // 获取该月份该排名的车型
                    const modelKey = monthlyRankings[month]?.[rowIndex];
                    const model = tableData.find(item => item.modelName === modelKey);
                    
                    if (model && model[month] !== 0) {
                      const sales = model[month] as number;
                      
                      return (
                        <td key={month} className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            {/* 车型信息 - 移除圆圈，支持换行 */}
                            <div className="flex flex-col items-center mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white text-center break-words max-w-[120px]">{model.modelName}</span>
                            </div>
                            
                            {/* 销量 */}
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              销量: {formatNumber(sales)}
                            </div>
                            
                            {/* 价格 */}
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {model.minPrice.toFixed(2)}-{model.maxPrice.toFixed(2)}万
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
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
          </div>
        )}
      </div>

      {/* 表格说明 */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        注：表格展示{selectedVehicleType}车辆类型下每个月份按销量单独排名的前10车型数据，可通过下拉框选择不同的车辆类型查看。
      </p>
    </motion.div>
  );
};

export default VehicleTypeTop10Table;