import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange, CarCompany } from '../types';
import { getCurrentCarModelData, formatMonthWithYear, monthlySalesData2024, carCompanies } from '../mocks/data';
import { energyTypes } from '../mocks/energyTypes';
import CarCompanySelector from './CarCompanySelector';

interface EnergyTypeMonthlySalesTableProps {
  className?: string;
  dateRange?: DateRange;
}

// 定义数据显示类型
type DataType = 'sales' | 'mom' | 'yoy';

interface TableRowData {
  company: string;
  companyColor: string;
  energyType: string;
  energyTypeColor: string;
  totalSales: number;
  [monthName: string]: number | string;
  [monthNameWithType: string]: number | string; // 用于存储带类型的数据，如 "2025.01-mom"
}

interface ManufacturerSpan {
  manufacturer: string;
  startIndex: number;
  span: number;
}

const EnergyTypeMonthlySalesTable: React.FC<EnergyTypeMonthlySalesTableProps> = ({ className = '', dateRange }) => {
  const [selectedCompanies, setSelectedCompanies] = useState<CarCompany[]>(carCompanies);
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  // 存储车企的原始顺序
  const [companyOrder, setCompanyOrder] = useState<string[]>([]);
  // 数据显示类型选择
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>(['sales', 'mom', 'yoy']);
  // 用于跟踪厂商单元格的合并信息
  const [manufacturerSpans, setManufacturerSpans] = useState<ManufacturerSpan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 当选中的车企变化或日期范围变化时，更新表格数据
  useEffect(() => {
    if (selectedCompanies.length === 0) return;

    const loadData = () => {
      setIsLoading(true);
      try {
        // 获取所有车型数据
        const currentData = getCurrentCarModelData(dateRange);
        
        // 按年月组合分组数据
        const monthlyDataMap = new Map<string, Record<string, Record<string, number>>>();
        
        // 首先，为所有年月组合初始化数据结构
        const allMonthYearKeys = new Set<string>();
        currentData.forEach(item => {
          const monthYearKey = `${item.year}-${item.month}`;
          allMonthYearKeys.add(monthYearKey);
        });
        
        // 初始化所有年月组合的数据
        allMonthYearKeys.forEach(monthYearKey => {
          if (!monthlyDataMap.has(monthYearKey)) {
            monthlyDataMap.set(monthYearKey, {});
          }
          
          const monthData = monthlyDataMap.get(monthYearKey)!;
          // 为每个选中的公司和能源类型组合初始化数据为0
          selectedCompanies.forEach(company => {
            if (!monthData[company.name]) {
              monthData[company.name] = {};
            }
            
            energyTypes.forEach(energyType => {
              if (monthData[company.name][energyType.name] === undefined) {
                monthData[company.name][energyType.name] = 0;
              }
            });
          });
        });
        
        // 然后，累加所有数据
        currentData.forEach(item => {
          const monthYearKey = `${item.year}-${item.month}`;
          const monthData = monthlyDataMap.get(monthYearKey)!;
          
          // 累加当前公司和能源类型的销量
          if (selectedCompanies.some(company => company.name === item.manufacturer)) {
            if (!monthData[item.manufacturer]) {
              monthData[item.manufacturer] = {};
            }
            monthData[item.manufacturer][item.energyType] = (monthData[item.manufacturer][item.energyType] || 0) + item.sales;
          }
        });
        
        // 转换为数组并按年月排序
        const data = Array.from(monthlyDataMap.entries()).sort((a, b) => {
          if (a[0].split('-')[0] !== b[0].split('-')[0]) {
            return parseInt(a[0].split('-')[0]) - parseInt(b[0].split('-')[0]);
          }
          const monthA = parseInt(a[0].split('-')[1].replace('月', ''));
          const monthB = parseInt(b[0].split('-')[1].replace('月', ''));
          return monthA - monthB;
        });

        // 生成合并后的表格数据
        generateCombinedTableData(data);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedCompanies, dateRange]);

  // 当表格数据第一次加载时，保存车企的原始顺序
  useEffect(() => {
    if (tableData.length > 0 && companyOrder.length === 0) {
      const uniqueCompanies = Array.from(new Set(tableData.map(row => row.company)));
      setCompanyOrder(uniqueCompanies);
    }
  }, [tableData]);

  // 当排序配置变化时，重新排序数据
  useEffect(() => {
    if (sortConfig) {
      const sortedData = [...tableData].sort((a, b) => {
        // 优先按公司的原始顺序排序
        if (companyOrder.length > 0 && a.company !== b.company) {
          const indexA = companyOrder.findIndex(company => company === a.company);
          const indexB = companyOrder.findIndex(company => company === b.company);
          // 如果两个公司都在原始顺序中，按照原始顺序排序
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // 如果只有一个公司在原始顺序中，它应该排在前面
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          // 如果两个公司都不在原始顺序中，按照名称排序
          return sortConfig.direction === 'asc' 
            ? a.company.localeCompare(b.company) 
            : b.company.localeCompare(a.company);
        }
        
        // 按能源类型排序
        const energyTypeOrder = energyTypes.map(type => type.name);
        if (a.energyType !== b.energyType) {
          const indexA = energyTypeOrder.findIndex(type => type === a.energyType);
          const indexB = energyTypeOrder.findIndex(type => type === b.energyType);
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          return sortConfig.direction === 'asc' 
            ? a.energyType.localeCompare(b.energyType) 
            : b.energyType.localeCompare(a.energyType);
        }
        
        // 按指定的排序键排序
        const valueA = a[sortConfig.key];
        const valueB = b[sortConfig.key];
        
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          if (valueA < valueB) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (valueA > valueB) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
        }
        
        return 0;
      });
      
      setTableData(sortedData);
    }
  }, [sortConfig, tableData, companyOrder]);

  // 计算厂商单元格合并信息
  useEffect(() => {
    if (tableData.length === 0) {
      setManufacturerSpans([]);
      return;
    }

    const spans: ManufacturerSpan[] = [];
    let currentManufacturer = tableData[0].company;
    let currentSpan = 1;

    for (let i = 1; i < tableData.length; i++) {
      if (tableData[i].company === currentManufacturer) {
        currentSpan++;
      } else {
        spans.push({
          manufacturer: currentManufacturer,
          startIndex: i - currentSpan,
          span: currentSpan
        });
        currentManufacturer = tableData[i].company;
        currentSpan = 1;
      }
    }

    // 添加最后一个厂商的合并信息
    spans.push({
      manufacturer: currentManufacturer,
      startIndex: tableData.length - currentSpan,
      span: currentSpan
    });

    setManufacturerSpans(spans);
  }, [tableData]);

  // 生成合并后的表格数据
  const generateCombinedTableData = (data: [string, Record<string, Record<string, number>>][]) => {
    const uniqueMonths = data.map(([key, value]) => {
      const [year, month] = key.split('-');
      return formatMonthWithYear(month, parseInt(year));
    });
    
    // 初始化表格数据结构
    const tableDataArray: TableRowData[] = [];
    
    // 为每个车企和能源类型组合创建数据行
    selectedCompanies.forEach(company => {
      energyTypes.forEach(energyType => {
        const rowData: TableRowData = {
          company: company.name,
          companyColor: company.color,
          energyType: energyType.name,
          energyTypeColor: energyType.color,
          totalSales: 0
        };
        
        // 为每个月添加销量、环比、同比数据
        uniqueMonths.forEach((month, index) => {
          // 找到对应月份的数据
          const monthData = data.find(([key]) => {
            const [year, m] = key.split('-');
            const formatted = formatMonthWithYear(m, parseInt(year));
            return formatted === month;
          });
          
          // 从原始数据中提取当前公司和能源类型的销量
          const monthSales = monthData ? monthData[1][company.name]?.[energyType.name] || 0 : 0;
          
          // 销量数据
          rowData[month] = monthSales;
          
          // 提取月份数字和年份
          const monthNum = parseInt(month.split('.')[1]);
          const year = parseInt(month.split('.')[0]);
          
          // 计算环比 (2025年1月不需要环比)
          if (!(year === 2025 && monthNum === 1) && index > 0) {
            const prevMonth = uniqueMonths[index - 1];
            const prevMonthData = data.find(([key]) => {
              const [prevYear, prevM] = key.split('-');
              const formatted = formatMonthWithYear(prevM, parseInt(prevYear));
              return formatted === prevMonth;
            });
            
            const prevMonthSales = prevMonthData ? prevMonthData[1][company.name]?.[energyType.name] || 0 : 0;
            
            if (prevMonthSales > 0) {
              rowData[`${month}-mom`] = ((monthSales - prevMonthSales) / prevMonthSales * 100).toFixed(2);
            } else {
              rowData[`${month}-mom`] = '-';
            }
          } else {
            rowData[`${month}-mom`] = '-';
          }
          
          // 计算同比 (2025年数据不需要同比)
          if (year !== 2025) {
            // 查找去年同月数据
            // 从2024年数据中查找
            const lastYearMonthData = monthlySalesData2024.filter(
              item => item.company === company.name && 
                     parseInt(item.month) === monthNum
            );
            
            if (lastYearMonthData.length > 0 && lastYearMonthData[0].sales > 0) {
              // 这里我们使用简化的同比计算，因为实际去年的能源类型数据可能不完整
              // 在真实应用中，应该从更详细的数据中获取去年的能源类型销量
              const lastYearSales = lastYearMonthData.reduce((sum, item) => sum + item.sales, 0);
              rowData[`${month}-yoy`] = ((monthSales - lastYearSales) / lastYearSales * 100).toFixed(2);
            } else {
              rowData[`${month}-yoy`] = '-';
            }
          } else {
            rowData[`${month}-yoy`] = '-';
          }
          
          // 累加到总销量
          rowData.totalSales = (rowData.totalSales as number) + monthSales;
        });
        
        // 添加到表格数据数组
        tableDataArray.push(rowData);
      });
    });
    
    setTableData(tableDataArray);
  };

  // 处理排序
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

  // 表格动画配置
  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
  };

  // 获取唯一的月份列表（用于渲染表格）
  const uniqueMonths = Array.from(new Set(tableData.map(row => {
    const monthKeys = Object.keys(row).filter(key => key.includes('.') && !key.includes('-'));
    return monthKeys;
  }).flat())).sort();

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">车企月度能源类型销量明细</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            各车企每月各能源类型销量详细数据，包括销量、环比和同比增长
          </p>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 md:mt-0 w-full md:w-auto">
          <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-lg">
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
          
          <CarCompanySelector 
            onCompanyChange={setSelectedCompanies} 
            initialSelectedCompanies={selectedCompanies}
          />
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[900px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400 flex items-center">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              <span>加载数据中...</span>
            </div>
          </div>
        ) : tableData.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* 表格头部 - 分层表头 */}
            <thead className="sticky top-0 z-10">
      <tr className="bg-gray-100 dark:bg-gray-800">
        <th rowSpan={2} 
          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 sticky left-0 z-20 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
          onClick={() => handleSort('company')}
          style={{ minWidth: '60px' }}
        >
          <div className="flex items-center">
            <span className="text-xs">车企</span>
            {sortConfig?.key === 'company' && (
              <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
            )}
         </div>
       </th>
     
       <th rowSpan={2} 
         className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 sticky left-[60px] z-20 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
         onClick={() => handleSort('energyType')}
         style={{ minWidth: '60px' }}
       >
         <div className="flex items-center">
           <span className="text-xs">能源类型</span>
           {sortConfig?.key === 'energyType' && (
             <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
           )}
        </div>
      </th>
            
             {/* 月份表头 - 合并单元格 */}
             {uniqueMonths.map((month) => (
               <th 
                 key={`month-${month}`} 
                 colSpan={selectedDataTypes.length} 
                 className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
               >
                 <div className="flex items-center justify-center">
                   <span className="text-sm">{month}</span>
                 </div>
               </th>
             ))}
             
             <th rowSpan={2} 
               className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
               onClick={() => handleSort('totalSales')}
             >
               <div className="flex items-center justify-center">
                 <span className="text-xs">总计</span>
                 {sortConfig?.key === 'totalSales' && (
                   <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                 )}
              </div>
            </th>
          </tr>
          
          {/* 第二层表头 - 根据选择显示销量、环比、同比 */}
          <tr className="bg-gray-100 dark:bg-gray-800">
            {uniqueMonths.map((month) => (
              <>
                {selectedDataTypes.includes('sales') && (
                  <th 
                    key={`${month}-sales`} 
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => handleSort(month)}
                    style={{ minWidth: '40px' }}
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-xs">销量</span>
                      {sortConfig?.key === month && (
                        <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                      )}
                    </div>
                  </th>
                )}
                
                {selectedDataTypes.includes('mom') && (
                  <th 
                    key={`${month}-mom`} 
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => handleSort(`${month}-mom`)}
                    style={{ minWidth: '40px' }}
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-xs">环比</span>
                      {sortConfig?.key === `${month}-mom` && (
                        <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                      )}
                    </div>
                  </th>
                )}
                
                {selectedDataTypes.includes('yoy') && (
                  <th 
                    key={`${month}-yoy`} 
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => handleSort(`${month}-yoy`)}
                    style={{ minWidth: '40px' }}
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-xs">同比</span>
                      {sortConfig?.key === `${month}-yoy` && (
                        <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                      )}
                    </div>
                  </th>
                )}
              </>
            ))}
          </tr>
          </thead>
          
          {/* 表格主体 */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tableData.map((row, index) => {
                   // 查找当前行是否需要显示厂商名称
                   const currentSpan = manufacturerSpans.find(span => span.startIndex === index);
                   
                   // 确定当前行的背景色，用于冻结列的背景色
                   const rowBgColor = index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750';
                   
                   return (
                     <tr 
                       key={`${row.company}-${row.energyType}-${index}`} 
                       className={rowBgColor}
                     >
                        {/* 车企名称单元格 - 根据合并信息决定是否显示和合并 */}
                        {currentSpan ? (
                            <td 
                             className={`px-2 py-1.5 whitespace-nowrap sticky left-0 z-10 border-r border-gray-200 dark:border-gray-700 ${rowBgColor}`} 
                              style={{ verticalAlign: 'middle', minWidth: '60px' }}
                              rowSpan={currentSpan.span}
                           >
                             <div className="flex items-center">
                               <div 
                                 className="h-5 w-5 rounded-full flex items-center justify-center mr-1" 
                                 style={{ backgroundColor: row.companyColor }}
                               >
                                <span className="text-white text-xs font-medium">{row.company[0]}</span>
                             </div>
                             <span className="text-sm font-medium text-gray-900 dark:text-white">{row.company}</span>
                           </div>
                           </td>
                         ) : null}
                  
                    {/* 能源类型单元格 */}
                       <td className={`px-2 py-1.5 whitespace-nowrap sticky left-[60px] z-10 border-r border-gray-200 dark:border-gray-700 ${rowBgColor}`} style={{ verticalAlign: 'middle', minWidth: '60px' }}>
                        <div className="flex items-center">
                          <div 
                            className="h-5 w-5 rounded-full flex items-center justify-center mr-1" 
                            style={{ backgroundColor: row.energyTypeColor }}
                          >
                           <i className={`fa-solid fa-bolt text-white text-xs`}></i>
                         </div>
                         <span className="text-sm font-medium text-gray-900 dark:text-white">{row.energyType}</span>
                       </div>
                      </td>
                    
                     {/* 月份数据单元格 */}
                     {uniqueMonths.map((month) => (
                       <>
                         {selectedDataTypes.includes('sales') && (
                           <td 
                             key={`${month}-sales`} 
                             className="px-1 py-1.5 text-center"
                             style={{ verticalAlign: 'middle', minWidth: '40px' }}
                           >
                             <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(row[month] as number)}</p>
                           </td>
                         )}
                         
                         {selectedDataTypes.includes('mom') && (
                           <td 
                             key={`${month}-mom`} 
                             className={`px-1 py-1.5 text-center ${getPercentageColorClass(row[`${month}-mom`])}`}
                             style={{ verticalAlign: 'middle', minWidth: '40px' }}
                           >
                             <p className="text-sm font-medium">{formatPercentage(row[`${month}-mom`])}</p>
                           </td>
                         )}
                         
                         {selectedDataTypes.includes('yoy') && (
                           <td 
                             key={`${month}-yoy`} 
                             className={`px-1 py-1.5 text-center ${getPercentageColorClass(row[`${month}-yoy`])}`}
                             style={{ verticalAlign: 'middle', minWidth: '40px' }}
                           >
                             <p className="text-sm font-medium">{formatPercentage(row[`${month}-yoy`])}</p>
                           </td>
                         )}
                       </>
                     ))}
                   
                     {/* 总计单元格 */}
                     <td 
                       className="px-1 py-1.5 text-center"
                       style={{ verticalAlign: 'middle' }}
                     >
                       <p className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(row.totalSales as number)}</p>
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
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>注：2025年1月不显示环比数据，2025年全年不显示同比数据，使用"-"代替。</p>
        <p className="mt-1">数据基于选定的时间范围，按车企和能源类型汇总统计。</p>
      </div>
    </motion.div>
  );
};

export default EnergyTypeMonthlySalesTable;