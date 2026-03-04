import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from '../types';
import { getCurrentCarModelData, carCompanies, formatMonthWithYear, monthlySalesData2024 } from '../mocks/data';
import CarCompanySelector from './CarCompanySelector';

interface PriceRangeGrowthRateTableProps {
  className?: string;
  dateRange?: DateRange;
}

// 定义价格区间
const PRICE_RANGES = [
  { name: '10万以下', min: 0, max: 10, color: '#3b82f6' },
  { name: '10~15万', min: 10, max: 15, color: '#10b981' },
  { name: '15~25万', min: 15, max: 25, color: '#f59e0b' },
  { name: '25~35万', min: 25, max: 35, color: '#8b5cf6' },
  { name: '35~50万', min: 35, max: 50, color: '#ec4899' },
  { name: '50万以上', min: 50, max: Infinity, color: '#ef4444' }
];

interface TableRowData {
  company: string;
  companyColor: string;
  priceRange: string;
  [monthName: string]: number | string;
}

interface ManufacturerSpan {
  manufacturer: string;
  startIndex: number;
  span: number;
}

const PriceRangeGrowthRateTable: React.FC<PriceRangeGrowthRateTableProps> = ({ className = '', dateRange }) => {
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState(carCompanies);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  // 用于跟踪厂商单元格的合并信息
  const [manufacturerSpans, setManufacturerSpans] = useState<ManufacturerSpan[]>([]);

  // 当日期范围或选中的车企变化时，更新表格数据
  useEffect(() => {
    updateTableData();
  }, [dateRange, selectedCompanies]);

  // 当排序配置变化时，重新排序数据
  useEffect(() => {
    if (sortConfig) {
      const sortedData = [...tableData].sort((a, b) => {
        // 首先按公司名称排序
        if (a.company !== b.company) {
          return sortConfig.direction === 'asc' 
            ? a.company.localeCompare(b.company) 
            : b.company.localeCompare(a.company);
        }
        
        // 然后按价格区间排序
        const rangeAIndex = PRICE_RANGES.findIndex(range => range.name === a.priceRange);
        const rangeBIndex = PRICE_RANGES.findIndex(range => range.name === b.priceRange);
        
        if (rangeAIndex !== rangeBIndex) {
          return sortConfig.direction === 'asc' 
            ? rangeAIndex - rangeBIndex 
            : rangeBIndex - rangeAIndex;
        }
        
        // 最后按指定的排序键排序
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
  }, [sortConfig, tableData]);

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

  // 获取唯一的月份列表
  const getUniqueMonths = () => {
    const carModelData = getCurrentCarModelData(dateRange);
    const months = new Set<string>();
    
    carModelData.forEach(model => {
      const monthKey = formatMonthWithYear(model.month, model.year);
      months.add(monthKey);
    });
    
    return Array.from(months).sort();
  };

  // 更新表格数据
  const updateTableData = () => {
    const carModelData = getCurrentCarModelData(dateRange);
    const selectedCompanyNames = selectedCompanies.map(company => company.name);
    const months = getUniqueMonths();
    
    // 初始化表格数据结构
    const tableDataArray: TableRowData[] = [];
    
    // 为每个车企和价格区间组合创建数据行
    selectedCompanies.forEach(company => {
      PRICE_RANGES.forEach(range => {
        const rowData: TableRowData = {
          company: company.name,
          companyColor: company.color,
          priceRange: range.name
        };
        
        // 初始化各月份的环比和同比数据为空
        months.forEach(month => {
          rowData[`${month}-环比`] = '-';
          rowData[`${month}-同比`] = '-';
        });
        
        tableDataArray.push(rowData);
      });
    });
    
    // 计算环比和同比数据
    calculateGrowthRates(tableDataArray, carModelData, months, selectedCompanyNames);
    
    setTableData(tableDataArray);
  };

  // 计算环比和同比数据
  const calculateGrowthRates = (
    tableDataArray: TableRowData[], 
    carModelData: any[], 
    months: string[], 
    selectedCompanyNames: string[]
  ) => {
    // 首先计算每个车企在每个价格区间的月度销量
    const monthlySales: Record<string, Record<string, Record<string, number>>> = {};
    
    // 初始化数据结构
    selectedCompanyNames.forEach(company => {
      monthlySales[company] = {};
      PRICE_RANGES.forEach(range => {
        monthlySales[company][range.name] = {};
        months.forEach(month => {
          monthlySales[company][range.name][month] = 0;
        });
      });
    });
    
    // 计算每个车企在每个价格区间的月度销量
    carModelData.forEach(model => {
      if (!selectedCompanyNames.includes(model.manufacturer)) return;
      
      const price = model.minPrice; // 使用最低价格作为分类依据
      const monthKey = formatMonthWithYear(model.month, model.year);
      
      // 查找价格所在的区间
      const priceRange = PRICE_RANGES.find(range => 
        price >= range.min && price < range.max
      );
      
      if (priceRange && months.includes(monthKey)) {
        monthlySales[model.manufacturer][priceRange.name][monthKey] += model.sales;
      }
    });
    
    // 计算环比和同比
    tableDataArray.forEach(row => {
      const company = row.company;
      const priceRange = row.priceRange;
      
      months.forEach((month, index) => {
        // 提取月份数字和年份
        const [year, monthNum] = month.split('.');
        const currentMonth = parseInt(monthNum);
        const currentYear = parseInt(year);
        
        // 计算环比 - 2025年1月不显示环比
        if (!(currentYear === 2025 && currentMonth === 1) && index > 0) {
          const prevMonth = months[index - 1];
          const currentSales = monthlySales[company][priceRange][month];
          const prevSales = monthlySales[company][priceRange][prevMonth];
          
          if (prevSales > 0) {
            const momGrowth = ((currentSales - prevSales) / prevSales) * 100;
            row[`${month}-环比`] = momGrowth;
          }
        }
        
        // 计算同比 - 2025年全年不显示同比
        if (currentYear !== 2025) {
          // 查找去年同月数据
          const lastYearData = monthlySalesData2024.filter(
            item => item.company === company && 
                   parseInt(item.month) === currentMonth
          );
          
          if (lastYearData.length > 0 && lastYearData[0].sales > 0) {
            const currentSales = monthlySales[company][priceRange][month];
            const lastYearSales = lastYearData.reduce((sum, item) => sum + item.sales, 0);
            
            const yoyGrowth = ((currentSales - lastYearSales) / lastYearSales) * 100;
            row[`${month}-同比`] = yoyGrowth;
          }
        }
      });
    });
  };

  // 处理排序
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
  const uniqueMonths = getUniqueMonths();

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">车企-价格分类销量变化率</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            各车企在不同价格区间的销量同比和环比变化率
          </p>
        </div>
        <CarCompanySelector 
          onCompanyChange={setSelectedCompanies} 
          initialSelectedCompanies={selectedCompanies}
        />
      </div>

       <div className="overflow-x-auto max-h-[900px]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
           {/* 表格头部 */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 dark:bg-gray-800">
                 <th 
                   className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                   onClick={() => handleSort('company')}
                   style={{ minWidth: '30px' }}
                 >
                   <div className="flex items-center">
                     <span className="text-xs">厂商</span>
                     {sortConfig?.key === 'company' && (
                       <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                     )}
                  </div>
                </th>
               
                        <th 
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => handleSort('priceRange')}
                          style={{ minWidth: '30px' }}
                        >
                          <div className="flex items-center">
                            <span className="text-xs">价格</span>
                            {sortConfig?.key === 'priceRange' && (
                              <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                            )}
                         </div>
                       </th>
               
                {/* 月份表头 - 每个月包含环比和同比两列 */}
                {uniqueMonths.map((month) => (
                  <React.Fragment key={month}>
                    <th 
                      className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort(`${month}-环比`)}
                      style={{ minWidth: '40px' }}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-sm">{month}</span>
                        <span className="text-xs">环比</span>
                     {sortConfig?.key === `${month}-环比` && (
                       <i className={`fa-solid mt-0.5 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                     )}
                   </div>
                 </th>
                 <th 
                   className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                   onClick={() => handleSort(`${month}-同比`)}
                   style={{ minWidth: '40px' }}
                 >
                   <div className="flex flex-col items-center">
                     <span className="text-sm">{month}</span>
                     <span className="text-xs">同比</span>
                  {sortConfig?.key === `${month}-同比` && (
                    <i className={`fa-solid mt-0.5 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                  )}
                </div>
              </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
           
           {/* 表格主体 */}
           <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
             {tableData.length > 0 ? (
               tableData.map((row, index) => {
                 // 查找当前行是否需要显示厂商名称
                 const currentSpan = manufacturerSpans.find(span => span.startIndex === index);
                 
                 return (
                   <tr 
                     key={`${row.company}-${row.priceRange}-${index}`} 
                     className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                   >
                      {/* 车企名称单元格 - 根据合并信息决定是否显示和合并 */}
                      {currentSpan ? (
                          <td 
                           className="px-1 py-1.5 whitespace-nowrap" 
                            style={{ verticalAlign: 'middle', minWidth: '35px' }}
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
                      
                      {/* 价格区间单元格 */}
                         <td className="px-1 py-1.5 whitespace-nowrap" style={{ verticalAlign: 'middle', minWidth: '35px' }}>
                          <span className="text-sm text-gray-900 dark:text-white">{row.priceRange}</span>
                        </td>
                       
                        {/* 月份数据单元格 - 每个月包含环比和同比两列 */}
                        {uniqueMonths.map((month) => {
                          const momGrowth = row[`${month}-环比`];
                          const yoyGrowth = row[`${month}-同比`];
                          
                          return (
                            <React.Fragment key={`${month}-${index}`}>
                              <td 
                                className={`px-1 py-1.5 text-center ${getPercentageColorClass(momGrowth)} rounded`}
                                style={{ verticalAlign: 'middle', minWidth: '40px' }}
                              >
                                <p className="text-sm font-medium">{formatPercentage(momGrowth)}</p>
                             </td>
                             <td 
                               className={`px-1 py-1.5 text-center ${getPercentageColorClass(yoyGrowth)} rounded`}
                               style={{ verticalAlign: 'middle', minWidth: '40px' }}
                             >
                               <p className="text-sm font-medium">{formatPercentage(yoyGrowth)}</p>
                            </td>
                            </React.Fragment>
                          );
                        })}
                   </tr>
                 );
               })
             ) : (
               <tr>
                 <td colSpan={uniqueMonths.length * 2 + 3} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                   暂无数据
                 </td>
               </tr>
             )}
           </tbody>
         </table>
       </div>
       
       {/* 说明信息 */}
       <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
         <p>注：2025年1月不显示环比数据，2025年全年不显示同比数据，使用"-"代替。</p>
       </div>
    </motion.div>
  );
};

export default PriceRangeGrowthRateTable;