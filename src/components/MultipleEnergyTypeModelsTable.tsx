import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from '../types';
import { getCurrentCarModelData, formatMonthWithYear, getLatestModelPrice } from '../mocks/data';
import { getEnergyTypeColor, getEnergyTypeIcon } from '../mocks/energyTypes';

interface MultipleEnergyTypeModelsTableProps {
  className?: string;
  dateRange?: DateRange;
}

// 月份销量数据类型
interface MonthSalesData {
  [energyType: string]: number;
}

// 表格行数据类型
interface TableRowData {
  manufacturer: string;
  brand: string;
  modelName: string;
  energyTypes: string[];
  totalSales: number;
  // 保存每个月份的总销量
  [monthName: string]: number | string | string[];
  // 保存每个月份各能源类型的销量数据
  monthlyEnergyTypeSales: Map<string, MonthSalesData>;
}

const MultipleEnergyTypeModelsTable: React.FC<MultipleEnergyTypeModelsTableProps> = ({
  className = '',
  dateRange
}) => {
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [months, setMonths] = useState<string[]>([]);

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        // 获取所有车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 找出同一品牌同一车型但有不同能源类型的车型
        const modelKeyMap = new Map<string, {
          manufacturer: string;
          brand: string;
          modelName: string;
          energyTypes: Set<string>;
          monthlySales: Map<string, Record<string, number>>;
        }>();
        
        // 构建车型标识并收集能源类型和销量数据
        carModelData.forEach(item => {
          // 创建车型唯一标识：车企-品牌-车型名称
          const modelKey = `${item.manufacturer}-${item.brand}-${item.modelName}`;
          
          if (!modelKeyMap.has(modelKey)) {
            modelKeyMap.set(modelKey, {
              manufacturer: item.manufacturer,
              brand: item.brand,
              modelName: item.modelName,
              energyTypes: new Set<string>(),
              monthlySales: new Map<string, Record<string, number>>()
            });
          }
          
          const modelData = modelKeyMap.get(modelKey)!;
          modelData.energyTypes.add(item.energyType);
          
          // 格式化月份为 YYYY.MM 格式
          const formattedMonth = formatMonthWithYear(item.month, item.year);
          
          // 初始化该月份的数据
          if (!modelData.monthlySales.has(formattedMonth)) {
            modelData.monthlySales.set(formattedMonth, {});
          }
          
          const monthSales = modelData.monthlySales.get(formattedMonth)!;
          monthSales[item.energyType] = (monthSales[item.energyType] || 0) + item.sales;
        });
        
        // 筛选出有多种能源类型的车型
        const multiEnergyTypeModels = Array.from(modelKeyMap.values())
          .filter(model => model.energyTypes.size > 1);
        
        // 获取所有唯一的月份并排序
        const allMonths = Array.from(new Set(
          multiEnergyTypeModels.flatMap(model => 
            Array.from(model.monthlySales.keys())
          )
        )).sort();
        
        // 构建表格数据
        const tableData: TableRowData[] = multiEnergyTypeModels.map(model => {
          const row: any = {
            manufacturer: model.manufacturer,
            brand: model.brand,
            modelName: model.modelName,
            energyTypes: Array.from(model.energyTypes),
            totalSales: 0,
            monthlyEnergyTypeSales: new Map<string, MonthSalesData>()
          };
          
          // 为每个月添加销量数据
          allMonths.forEach(month => {
            const monthSales = model.monthlySales.get(month);
            if (monthSales) {
              // 保存各能源类型的销量数据
              row.monthlyEnergyTypeSales.set(month, { ...monthSales });
              
              // 计算总销量
              const totalMonthSales = Object.values(monthSales).reduce((sum, sales) => sum + sales, 0);
              row[month] = totalMonthSales;
              row.totalSales += totalMonthSales;
            } else {
              // 如果没有该月份数据，设置为0
              row.monthlyEnergyTypeSales.set(month, {});
              row[month] = 0;
            }
          });
          
          return row;
        });
        
        // 按总销量降序排序
        tableData.sort((a, b) => b.totalSales - a.totalSales);
        
        setTableData(tableData);
        setMonths(allMonths);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [dateRange]);

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 计算百分比
  const calculatePercentage = (value: number, total: number): string => {
    if (total === 0) return '0.0%';
    return ((value / total) * 100).toFixed(1) + '%';
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

  // 获取能源类型的样式类
  const getEnergyTypeStyleClass = (energyType: string): string => {
    const colorMap: Record<string, string> = {
      '纯电': 'text-blue-600 dark:text-blue-400',
      '插混': 'text-green-600 dark:text-green-400',
      '增程': 'text-purple-600 dark:text-purple-400',
      '燃油': 'text-red-600 dark:text-red-400'
    };
    return colorMap[energyType] || 'text-gray-600 dark:text-gray-400';
  };

  // 获取能源类型的背景样式类
  const getEnergyTypeBgStyleClass = (energyType: string): string => {
    const colorMap: Record<string, string> = {
      '纯电': 'bg-blue-50 dark:bg-blue-900/20',
      '插混': 'bg-green-50 dark:bg-green-900/20',
      '增程': 'bg-purple-50 dark:bg-purple-900/20',
      '燃油': 'bg-red-50 dark:bg-red-900/20'
    };
    return colorMap[energyType] || 'bg-gray-50 dark:bg-gray-800';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">多种能源类型车型信息</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          展示同一品牌同一车型但有不同能源类型的车型数据，包括各能源类型的销量和占比
        </p>
      </div>

      {/* 修改为固定高度和可上下滑动的模式 */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400 flex items-center">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              <span>加载数据中...</span>
            </div>
          </div>
        ) : tableData.length > 0 ? (
          // 使用div包裹表格，并设置最大高度和overflow-y滚动
           <div className="max-h-[900px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* 表格容器 - 确保冻结列能够正常工作 */}
            <div className="relative">
              {/* 表格 */}
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                 {/* 表头 - 使用sticky定位使其固定 */}
                   <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-20">
                   <tr>
                     {/* 车企列 - 不再使用sticky定位使其固定 */}
                      <th 
                       scope="col" 
                       className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
                       style={{ minWidth: '80px' }}
                     >
                       车企
                     </th>
                     {/* 车型列 - 合并品牌和车型显示，使用sticky定位使其固定 */}
                      <th 
                       scope="col" 
                       className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10"
                       style={{ minWidth: '160px' }}
                     >
                       车型
                     </th>
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      style={{ minWidth: '100px' }}
                    >
                      多种能源类型
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
                    <th 
                      scope="col" 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      style={{ minWidth: '80px' }}
                    >
                      总计
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {tableData.map((row, index) => (
                    <tr key={`${row.manufacturer}-${row.brand}-${row.modelName}`} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                       {/* 车企列 - 不再使用sticky定位使其固定 */}
                        <td className="px-4 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-700">
                         <div className="flex items-center">
                           <div className="h-8 w-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#3b82f6' }}>
                             <span className="text-white font-medium text-sm">{row.manufacturer[0]}</span>
                           </div>
                           <span className="text-sm font-medium text-gray-900 dark:text-white">{row.manufacturer}</span>
                         </div>
                       </td>
                       {/* 车型列 - 合并品牌和车型显示，使用sticky定位使其固定 */}
                        <td className="px-4 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 z-10">
                         <span className="text-sm font-medium text-gray-900 dark:text-white">{row.brand + ' ' + row.modelName}</span>
                       </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {(row.energyTypes as string[]).map((energyType, typeIndex) => {
                            // 根据能源类型设置不同的背景色
                            let bgColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                            let icon = 'fa-question';
                            
                            switch (energyType) {
                              case '纯电':
                                bgColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
                                icon = 'fa-bolt';
                                break;
                              case '插混':
                                bgColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
                                icon = 'fa-plug';
                                break;
                              case '增程':
                                bgColor = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
                                icon = 'fa-battery-full';
                                break;
                              case '燃油':
                                bgColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
                                icon = 'fa-fire';
                                break;
                            }
                            
                            return (
                              <div key={typeIndex} className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
                                <i className={`fa-solid ${icon} mr-1`}></i>
                                <span>{energyType}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      {months.map((month) => {
                        // 获取该月份的总销量和各能源类型的销量
                        const totalMonthSales = row[month] as number;
                        const energyTypeSales = row.monthlyEnergyTypeSales.get(month) || {};
                        
                        return (
                          <td key={month} className="px-4 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {/* 总销量 */}
                              <div className="text-sm font-medium text-gray-900 dark:text-white text-center mb-1">
                                {formatNumber(totalMonthSales)}
                              </div>
                              
                              {/* 各能源类型的销量和百分比 */}
                              <div className="flex flex-col gap-1">
                                {(row.energyTypes as string[]).map((energyType) => {
                                  const sales = energyTypeSales[energyType] || 0;
                                  const percentage = calculatePercentage(sales, totalMonthSales);
                                  
                                  return (
                                    <div 
                                      key={energyType} 
                                      className={`flex items-center justify-between px-2 py-1 rounded ${getEnergyTypeBgStyleClass(energyType)}`}
                                    >
                                      <div className="flex items-center">
                                        <i className={`fa-solid ${getEnergyTypeIcon(energyType)} mr-1 text-xs ${getEnergyTypeStyleClass(energyType)}`}></i>
                                        <span className={`text-xs ${getEnergyTypeStyleClass(energyType)}`}>{energyType}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium text-gray-900 dark:text-white">{formatNumber(sales)}</span>
                                        <span className={`text-xs ${getEnergyTypeStyleClass(energyType)}`}>({percentage})</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(row.totalSales as number)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
          </div>
        )}
      </div>

      {/* 表格说明 */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        注：表格展示同一品牌同一车型但有不同能源类型的车型数据，每个月份显示各能源类型的销量和占比。
      </p>
    </motion.div>
  );
};

export default MultipleEnergyTypeModelsTable;