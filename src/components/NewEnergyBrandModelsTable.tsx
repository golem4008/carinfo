import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from '../types';
import { getCurrentCarModelData, formatMonthWithYear, monthlySalesData2024 } from '../mocks/data';
import { getEnergyTypeIcon, getEnergyTypeColor } from '../mocks/energyTypes';
import { manufacturerCategories } from '../mocks/manufacturerCategories';

interface NewEnergyBrandModelsTableProps {
  className?: string;
  dateRange?: DateRange;
  theme?: 'light' | 'dark';
}

// 定义数据显示类型
type DataType = 'sales' | 'mom' | 'yoy';

interface TableRowData {
  manufacturer: string;
  brand: string;
  modelName: string;
  energyType: string;
  minPrice: number;
  maxPrice: number;
  totalSales: number;
  [monthName: string]: number | string;
  [monthNameWithType: string]: number | string; // 用于存储带类型的数据，如 "2025.01-mom"
}

interface ManufacturerSpan {
  manufacturer: string;
  startIndex: number;
  span: number;
}

interface BrandSpan {
  brand: string;
  manufacturer: string;
  startIndex: number;
  span: number;
}

const NewEnergyBrandModelsTable: React.FC<NewEnergyBrandModelsTableProps> = ({
  className = '',
  dateRange,
  theme = 'light'
}) => {
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>(['sales', 'mom', 'yoy']);
  // 用于跟踪厂商单元格的合并信息
  const [manufacturerSpans, setManufacturerSpans] = useState<ManufacturerSpan[]>([]);
  // 用于跟踪品牌单元格的合并信息
  const [brandSpans, setBrandSpans] = useState<BrandSpan[]>([]);

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        // 获取所有车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 筛选出新势力企业的数据
        const newEnergyModels = carModelData.filter(item => 
          manufacturerCategories.newEnergy.includes(item.manufacturer)
        );
        
        // 按年月组合分组数据
        const monthlyMap = new Map<string, Map<string, {
          sales: number, 
          minPrice: number, 
          maxPrice: number, 
          brand: string, 
          manufacturer: string,
          energyType: string
        }>>();
        
        // 获取所有唯一的月份并排序
        const allMonths = Array.from(new Set(
          newEnergyModels.map(model => formatMonthWithYear(model.month, model.year))
        )).sort();
        
        // 初始化每个月的数据结构
        allMonths.forEach(month => {
          monthlyMap.set(month, new Map());
        });
        
         // 收集每个月每个车型的销量数据
        newEnergyModels.forEach(item => {
          try {
            const formattedMonth = formatMonthWithYear(item.month, item.year);
            // 确保车型名称不为空
            const validModelName = item.modelName && item.modelName.trim() !== '' ? item.modelName : '未知车型';
            const modelKey = `${item.manufacturer}-${item.brand}-${validModelName}-${item.energyType}`;
            
            if (monthlyMap.has(formattedMonth)) {
              const monthMap = monthlyMap.get(formattedMonth)!;
              if (!monthMap.has(modelKey)) {
                monthMap.set(modelKey, {
                  sales: 0,
                  minPrice: item.minPrice,
                  maxPrice: item.maxPrice,
                  brand: item.brand,
                  manufacturer: item.manufacturer,
                  energyType: item.energyType,
                  modelName: validModelName // 确保存储有效的车型名称
                });
              }
              const modelData = monthMap.get(modelKey)!;
              modelData.sales += item.sales;
            }
          } catch (error) {
            console.error('处理车型数据时出错:', error, item);
            // 出错时继续处理其他数据，避免整个表格不显示
          }
        });
        
        // 构建表格数据
        const tableDataArray: TableRowData[] = [];
        
        // 收集所有唯一的车型
        const allModels = new Set<string>();
        monthlyMap.forEach(monthMap => {
          monthMap.forEach((_, modelKey) => allModels.add(modelKey));
        });
        
        // 为每个车型创建一行数据
        allModels.forEach(modelKey => {
          // 从任意一个月中获取车型的基本信息
          let basicInfo: any = null;
          
          // 查找包含该车型的任意一个月
          for (const month of allMonths) {
            const monthMap = monthlyMap.get(month);
            if (monthMap && monthMap.has(modelKey)) {
              basicInfo = monthMap.get(modelKey);
              break;
            }
          }
          
           if (basicInfo) {
            // 安全地解析modelKey，避免分割错误
            const parts = modelKey.split('-');
            const manufacturer = parts[0] || '未知厂商';
            const brand = parts[1] || '未知品牌';
            const modelName = parts[2] || '未知车型';
            const energyType = parts[3] || '未知能源';
            
            const row: any = {
              manufacturer: basicInfo.manufacturer,
              brand: basicInfo.brand,
              modelName: basicInfo.modelName || modelName, // 确保有车型名称显示
              energyType: basicInfo.energyType,
              minPrice: basicInfo.minPrice,
              maxPrice: basicInfo.maxPrice,
              totalSales: 0
            };
            
            // 为每个月添加销量、环比、同比数据
            allMonths.forEach((month, index) => {
              const monthMap = monthlyMap.get(month);
              const modelData = monthMap && monthMap.get(modelKey);
              const monthSales = modelData ? modelData.sales : 0;
              
              // 销量数据
              row[month] = monthSales;
              
              // 提取月份数字和年份
              const monthNum = parseInt(month.split('.')[1]);
              const year = parseInt(month.split('.')[0]);
              
              // 计算环比 (2025年1月不需要环比)
              if (!(year === 2025 && monthNum === 1) && index > 0) {
                const prevMonth = allMonths[index - 1];
                const prevMonthMap = monthlyMap.get(prevMonth);
                const prevModelData = prevMonthMap && prevMonthMap.get(modelKey);
                const prevMonthSales = prevModelData ? prevModelData.sales : 0;
                
                if (prevMonthSales > 0) {
                  const momGrowth = ((monthSales - prevMonthSales) / prevMonthSales * 100).toFixed(2);
                  row[`${month}-mom`] = momGrowth;
                } else {
                  row[`${month}-mom`] = '-';
                }
              } else {
                row[`${month}-mom`] = '-';
              }
              
              // 计算同比 (2025年数据不需要同比)
              if (year !== 2025) {
                // 模拟查找去年同月数据
                const lastYearData = monthlySalesData2024.filter(
                  item => item.company === manufacturer && 
                         parseInt(item.month) === monthNum
                );
                
                if (lastYearData.length > 0 && lastYearData[0].sales > 0) {
                  const lastYearSales = lastYearData.reduce((sum, item) => sum + item.sales, 0);
                  const yoyGrowth = ((monthSales - lastYearSales) / lastYearSales * 100).toFixed(2);
                  row[`${month}-yoy`] = yoyGrowth;
                } else {
                  row[`${month}-yoy`] = '-';
                }
              } else {
                row[`${month}-yoy`] = '-';
              }
              
              // 累加到总销量
              row.totalSales = (row.totalSales as number) + monthSales;
            });
            
            tableDataArray.push(row);
          }
        });
        
        // 按厂商、品牌、总销量降序排序
        tableDataArray.sort((a, b) => {
          // 先按厂商排序
          if (a.manufacturer !== b.manufacturer) {
            return a.manufacturer.localeCompare(b.manufacturer);
          }
          // 再按品牌排序
          if (a.brand !== b.brand) {
            return a.brand.localeCompare(b.brand);
          }
          // 最后按总销量降序排序
          return b.totalSales - a.totalSales;
        });
        
        setTableData(tableDataArray);
        setMonths(allMonths);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [dateRange]);

  // 计算厂商和品牌单元格合并信息
  useEffect(() => {
    if (tableData.length === 0) {
      setManufacturerSpans([]);
      setBrandSpans([]);
      return;
    }

    // 计算厂商单元格合并信息
    const manufacturerSpans: ManufacturerSpan[] = [];
    let currentManufacturer = tableData[0].manufacturer;
    let currentManufacturerSpan = 1;

    for (let i = 1; i < tableData.length; i++) {
      if (tableData[i].manufacturer === currentManufacturer) {
        currentManufacturerSpan++;
      } else {
        manufacturerSpans.push({
          manufacturer: currentManufacturer,
          startIndex: i - currentManufacturerSpan,
          span: currentManufacturerSpan
        });
        currentManufacturer = tableData[i].manufacturer;
        currentManufacturerSpan = 1;
      }
    }

    // 添加最后一个厂商的合并信息
    manufacturerSpans.push({
      manufacturer: currentManufacturer,
      startIndex: tableData.length - currentManufacturerSpan,
      span: currentManufacturerSpan
    });

    // 计算品牌单元格合并信息
    const brandSpans: BrandSpan[] = [];
    let currentBrand = tableData[0].brand;
    let currentManufacturerForBrand = tableData[0].manufacturer;
    let currentBrandSpan = 1;

    for (let i = 1; i < tableData.length; i++) {
      if (tableData[i].brand === currentBrand && tableData[i].manufacturer === currentManufacturerForBrand) {
        currentBrandSpan++;
      } else {
        brandSpans.push({
          brand: currentBrand,
          manufacturer: currentManufacturerForBrand,
          startIndex: i - currentBrandSpan,
          span: currentBrandSpan
        });
        currentBrand = tableData[i].brand;
        currentManufacturerForBrand = tableData[i].manufacturer;
        currentBrandSpan = 1;
      }
    }

    // 添加最后一个品牌的合并信息
    brandSpans.push({
      brand: currentBrand,
      manufacturer: currentManufacturerForBrand,
      startIndex: tableData.length - currentBrandSpan,
      span: currentBrandSpan
    });

    setManufacturerSpans(manufacturerSpans);
    setBrandSpans(brandSpans);
  }, [tableData]);

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || num === 0) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 格式化价格
  const formatPrice = (minPrice: number, maxPrice: number): string => {
    if (minPrice === 0 && maxPrice === 0) return '-';
    return `${minPrice.toFixed(2)}-${maxPrice.toFixed(2)}万`;
  };

  // 根据百分比值获取颜色类
  const getPercentageColorClass = (value: number | string): string => {
    if (value === '-') return 'text-gray-500';
    
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    
    if (numValue > 0) {
      // 正值：红色系，值越大颜色越深
      if (numValue > 20) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      if (numValue > 10) return 'bg-red-50 text-red-700 dark:bg-red-800/20 dark:text-red-200';
      if (numValue > 5) return 'bg-orange-50 text-orange-600 dark:bg-orange-800/20 dark:text-orange-200';
      return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-800/20 dark:text-yellow-200';
    } else if (numValue < 0) {
      // 负值：绿色系，值越小颜色越深
      const absValue = Math.abs(numValue);
      if (absValue > 20) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      if (absValue > 10) return 'bg-green-50 text-green-700 dark:bg-green-800/20 dark:text-green-200';
      if (absValue > 5) return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-800/20 dark:text-emerald-200';
      return 'bg-teal-50 text-teal-600 dark:bg-teal-800/20 dark:text-teal-200';
    } else {
      // 零值：中性色
      return 'bg-gray-50 text-gray-600 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };

  // 格式化百分比
  const formatPercentage = (value: number | string): string => {
    if (value === '-') return '-';
    
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    return `${numValue > 0 ? '+' : ''}${numValue.toFixed(1)}%`;
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

  // 处理数据类型选择变化
  const handleDataTypeChange = (type: DataType) => {
    setSelectedDataTypes(prev => {
      if (prev.includes(type)) {
        // 确保至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(t => t !== type);
        }
        return prev;
      } else {
        return [...prev, type];
      }
    });
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">新势力品牌车型销量情况</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            各新势力品牌车型的详细销量数据，包括每月销量、环比和同比增长
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-lg mt-4 md:mt-0">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">显示数据：</label>
          <div className="flex space-x-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('sales')}
                onChange={() => handleDataTypeChange('sales')}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('sales')}
              />
              <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">销量</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('mom')}
                onChange={() => handleDataTypeChange('mom')}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('mom')}
              />
              <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">环比</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={selectedDataTypes.includes('yoy')}
                onChange={() => handleDataTypeChange('yoy')}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('yoy')}
              />
              <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">同比</span>
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[900px] relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400 flex items-center">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              <span>加载数据中...</span>
            </div>
          </div>
        ) : tableData.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-10">
                 {/* 第一层表头 - 月份 */}
                 <tr className="bg-gray-100 dark:bg-gray-800">
                   <th 
                     rowSpan={2} 
                     className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                     style={{ minWidth: '80px' }}
                   >
                     厂商
                   </th>
                 <th 
                   rowSpan={2} 
                   className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                   style={{ minWidth: '80px' }}
                 >
                   品牌
                 </th>
                  <th 
                  rowSpan={2} 
                   className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative"
                    style={{ minWidth: '150px' }}
                 >
                   车型 (能源类型 / 价格)
                 </th>
                 {/* 月份表头 - 合并单元格 */}
                 {months.map((month) => (
                   <th 
                     key={`month-${month}`} 
                     colSpan={selectedDataTypes.length} 
                     className="px-1 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                     style={{ minWidth: selectedDataTypes.length * 40 }}
                   >
                     <div className="flex items-center justify-center">
                       <span className="text-sm">{month}</span>
                     </div>
                   </th>
                 ))}
                 <th 
                   rowSpan={2} 
                   className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                   style={{ minWidth: '80px' }}
                 >
                   总计
                 </th>
               </tr>
               
               {/* 第二层表头 - 根据选择显示销量、环比、同比 */}
               <tr className="bg-gray-100 dark:bg-gray-800">
                 {months.map((month) => (
                   <>
                     {selectedDataTypes.includes('sales') && (
                       <th 
                         key={`${month}-sales`} 
                         className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                         style={{ minWidth: '40px' }}
                       >
                         <span className="text-xs">销量</span>
                       </th>
                     )}
                     
                     {selectedDataTypes.includes('mom') && (
                       <th 
                         key={`${month}-mom`} 
                         className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                         style={{ minWidth: '40px' }}
                       >
                         <span className="text-xs">环比</span>
                       </th>
                     )}
                     
                     {selectedDataTypes.includes('yoy') && (
                       <th 
                         key={`${month}-yoy`} 
                         className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                         style={{ minWidth: '40px' }}
                       >
                         <span className="text-xs">同比</span>
                       </th>
                     )}
                   </>
                 ))}
               </tr>
             </thead>
            
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tableData.map((row, index) => {
                const energyTypeIcon = getEnergyTypeIcon(row.energyType as string);
                const energyTypeColor = getEnergyTypeColor(row.energyType as string);
                const price = formatPrice(row.minPrice as number, row.maxPrice as number);
                
                // 查找当前行是否需要显示厂商名称
                const currentManufacturerSpan = manufacturerSpans.find(span => span.startIndex === index);
                
                // 查找当前行是否需要显示品牌名称
                const currentBrandSpan = brandSpans.find(span => span.startIndex === index);
                
                return (
                  <tr key={`${row.manufacturer}-${row.brand}-${row.modelName}-${row.energyType}-${index}`} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    {/* 厂商名称单元格 - 根据合并信息决定是否显示和合并 */}
                    {currentManufacturerSpan ? (
                      <td 
                        className="px-4 py-3 whitespace-nowrap" 
                        style={{ verticalAlign: 'middle', minWidth: '80px' }}
                        rowSpan={currentManufacturerSpan.span}
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{row.manufacturer}</span>
                      </td>
                    ) : null}
                    
                    {/* 品牌名称单元格 - 根据合并信息决定是否显示和合并 */}
                    {currentBrandSpan ? (
                      <td 
                        className="px-4 py-3 whitespace-nowrap" 
                        style={{ verticalAlign: 'middle', minWidth: '80px' }}
                        rowSpan={currentBrandSpan.span}
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{row.brand}</span>
                      </td>
                    ) : null}
                    
                      {/* 车型名称单元格 - 合并能源类型和价格信息 */}
                      <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky left-0 z-0">
                       <div className="flex flex-col">
                         {/* 车型名称 */}
                         <span className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                           {row.modelName || '未知车型'}
                         </span>
                          {/* 能源类型和价格 */}
                         <div className="flex flex-col space-y-1">
                           <div className="flex items-center">
                             <div 
                               className="w-5 h-5 rounded-full mr-1.5 flex items-center justify-center"
                               style={{ backgroundColor: energyTypeColor }}
                             >
                               <i className={`fa-solid ${energyTypeIcon} text-white text-xs`}></i>
                             </div>
                             <span className="text-xs text-gray-700 dark:text-gray-300">{row.energyType}</span>
                           </div>
                             <div className="ml-6 bg-gray-50 dark:bg-gray-750 px-1 py-0.5 rounded text-[10px] text-gray-700 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                             {price}
                           </div>
                         </div>
                       </div>
                     </td>
                    
                    {/* 月份数据单元格 */}
                    {months.map((month) => (
                      <>
                        {selectedDataTypes.includes('sales') && (
                          <td 
                            key={`${month}-sales`} 
                            className="px-1 py-3 text-center"
                            style={{ verticalAlign: 'middle', minWidth: '40px' }}
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(row[month] as number)}</p>
                          </td>
                        )}
                        
                        {selectedDataTypes.includes('mom') && (
                          <td 
                            key={`${month}-mom`} 
                            className={`px-1 py-3 text-center ${getPercentageColorClass(row[`${month}-mom`])}`}
                            style={{ verticalAlign: 'middle', minWidth: '40px' }}
                          >
                            <p className="text-sm font-medium">{formatPercentage(row[`${month}-mom`])}</p>
                          </td>
                        )}
                        
                        {selectedDataTypes.includes('yoy') && (
                          <td 
                            key={`${month}-yoy`} 
                            className={`px-1 py-3 text-center ${getPercentageColorClass(row[`${month}-yoy`])}`}
                            style={{ verticalAlign: 'middle', minWidth: '40px' }}
                          >
                            <p className="text-sm font-medium">{formatPercentage(row[`${month}-yoy`])}</p>
                          </td>
                        )}
                      </>
                    ))}
                    
                    {/* 总计单元格 */}
                    <td 
                      className="px-4 py-3 text-center"
                      style={{ verticalAlign: 'middle' }}
                    >
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(row.totalSales as number)}</span>
                    </td>
                  </tr>
                );
              })}
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
        注：表格展示各新势力品牌车型的销量数据，包括厂商、品牌、车型（能源类型/价格）和各月份的销量、环比、同比增长信息。相同厂商和品牌的单元格已合并显示，2025年1月不显示环比数据，2025年全年不显示同比数据，使用"-"代替。
      </p>
    </motion.div>
  );
};

export default NewEnergyBrandModelsTable;