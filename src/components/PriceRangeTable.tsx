import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateRange } from '../types';
import { getCurrentCarModelData, carCompanies, monthlySalesData2024, getLatestModelPrice } from '../mocks/data';
import CarCompanySelector from './CarCompanySelector';
import { formatMonthWithYear } from '../mocks/data';

interface PriceRangeTableProps {
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

// 定义数据显示类型
type DataType = 'sales' | 'mom' | 'yoy';

interface TableRowData {
  company: string;
  companyColor: string;
  priceRange: string;
  totalSales: number;
  [monthName: string]: number | string;
  [monthNameWithType: string]: number | string; // 用于存储带类型的数据，如 "2025.01-mom"
}

interface ManufacturerSpan {
  manufacturer: string;
  startIndex: number;
  span: number;
}

const PriceRangeTable: React.FC<PriceRangeTableProps> = ({ className = '', dateRange }) => {
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState(carCompanies);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  // 存储每个厂商每个月的总销量
  const [companyMonthlyTotalSales, setCompanyMonthlyTotalSales] = useState<Record<string, Record<string, number>>>({});
  // 用于跟踪厂商单元格的合并信息
  const [manufacturerSpans, setManufacturerSpans] = useState<ManufacturerSpan[]>([]);
  // 数据显示类型选择
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>(['sales']);
  // 存储车企的原始顺序
  const [companyOrder, setCompanyOrder] = useState<string[]>([]);

  // 当日期范围或选中的车企变化时，更新表格数据
  useEffect(() => {
    updateTableData();
  }, [dateRange, selectedCompanies]);
  
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
    // 如果已有公司顺序，则按照该顺序创建数据行
    const companiesToProcess = companyOrder.length > 0 
      ? companyOrder.filter(company => selectedCompanyNames.includes(company))
      : selectedCompanyNames;
    
    // 确保所有选中的公司都在处理列表中
    selectedCompanyNames.forEach(company => {
      if (!companiesToProcess.includes(company)) {
        companiesToProcess.push(company);
      }
    });
    
    // 创建公司数据映射，用于快速查找颜色
    const companyColorMap = new Map<string, string>();
    selectedCompanies.forEach(company => {
      companyColorMap.set(company.name, company.color);
    });
    
    // 创建数据行
    companiesToProcess.forEach(companyName => {
      PRICE_RANGES.forEach(range => {
        const rowData: TableRowData = {
          company: companyName,
          companyColor: companyColorMap.get(companyName) || '#6b7280',
          priceRange: range.name,
          totalSales: 0
        };
        
        // 初始化各月份的销量为0
        months.forEach(month => {
          rowData[month] = 0;
        });
        
        tableDataArray.push(rowData);
      });
    });
    
           // 统计各车型的销量并累加到对应的车企、价格区间和月份
      carModelData.forEach(model => {
        if (!selectedCompanyNames.includes(model.manufacturer)) return;
        
        // 使用时间范围内最新的价格作为分类依据
        const latestPrice = getLatestModelPrice(
          carModelData,
          model.manufacturer,
          model.brand,
          model.modelName,
          dateRange
        );
        
        // 使用最新价格作为分类依据
          const price = latestPrice?.minPrice || model.minPrice;
          const monthKey = formatMonthWithYear(model.month, model.year);
        
        // 查找价格所在的区间
        const priceRange = PRICE_RANGES.find(range => 
          price >= range.min && price < range.max
        );
        
        if (priceRange) {
          // 查找对应的表格行
          const tableRow = tableDataArray.find(row => 
            row.company === model.manufacturer && row.priceRange === priceRange.name
          );
          
          if (tableRow) {
            // 累加到对应月份
            tableRow[monthKey] = (tableRow[monthKey] as number) + model.sales;
            
            // 累加到总销量
            tableRow.totalSales = (tableRow.totalSales as number) + model.sales;
          }
        }
      });
    
    // 计算每个厂商每个月的总销量
    const companyMonthlyTotals: Record<string, Record<string, number>> = {};
    
    // 初始化数据结构
    selectedCompanies.forEach(company => {
      companyMonthlyTotals[company.name] = {};
      months.forEach(month => {
        companyMonthlyTotals[company.name][month] = 0;
      });
    });
    
    // 累加每个厂商每个月的总销量
    tableDataArray.forEach(row => {
      months.forEach(month => {
        const sales = row[month] as number;
        companyMonthlyTotals[row.company][month] += sales;
      });
    });
    
    setCompanyMonthlyTotalSales(companyMonthlyTotals);
    
    // 计算环比和同比数据
    calculateGrowthRates(tableDataArray, carModelData, months);
    
    setTableData(tableDataArray);
  };

  // 计算环比和同比数据
  const calculateGrowthRates = (
    tableDataArray: TableRowData[], 
    carModelData: any[], 
    months: string[]
  ) => {
    // 遍历每个表格行
    tableDataArray.forEach(row => {
      const company = row.company;
      const priceRange = row.priceRange;
      
      // 遍历每个月份计算环比和同比
      months.forEach((month, index) => {
        // 提取月份数字和年份
        const [year, monthNum] = month.split('.');
        const currentMonth = parseInt(monthNum);
        const currentYear = parseInt(year);
        
        // 计算环比 - 2025年1月不显示环比
        if (!(currentYear === 2025 && currentMonth === 1) && index > 0) {
          const prevMonth = months[index - 1];
          const currentSales = row[month] as number;
          const prevSales = row[prevMonth] as number;
          
          if (prevSales > 0) {
            const momGrowth = ((currentSales - prevSales) / prevSales) * 100;
            row[`${month}-mom`] = momGrowth;
          } else {
            row[`${month}-mom`] = '-';
          }
        } else {
          row[`${month}-mom`] = '-';
        }
        
        // 计算同比 - 2025年全年不显示同比
        if (currentYear !== 2025) {
          // 查找去年同月数据
          const lastYearData = monthlySalesData2024.filter(
            item => item.company === company && 
                   parseInt(item.month) === currentMonth
          );
          
          if (lastYearData.length > 0 && lastYearData[0].sales > 0) {
            const currentSales = row[month] as number;
            const lastYearSales = lastYearData.reduce((sum, item) => sum + item.sales, 0);
            
            const yoyGrowth = ((currentSales - lastYearSales) / lastYearSales) * 100;
            row[`${month}-yoy`] = yoyGrowth;
          } else {
            row[`${month}-yoy`] = '-';
          }
        } else {
          row[`${month}-yoy`] = '-';
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

  // 计算价格区间占比 - 保留2位小数，如果销量为0则不显示
  const calculatePercentage = (value: number, total: number): string => {
    if (value === 0 || total === 0) return '';
    return `${((value / total) * 100).toFixed(2)}%`;
  };
  
  // 获取唯一的月份列表（用于渲染表格）
  const uniqueMonths = getUniqueMonths();

  // 表格动画配置
  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
  };

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">价格区间销量明细</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            各车企在不同价格区间的销量分布
          </p>
         </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
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
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
           {/* 表格头部 - 分层表头 */}
            <thead className="sticky top-0 z-10">
              {/* 第一层表头 - 月份 */}
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th rowSpan={2} 
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
              
               <th rowSpan={2} 
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
                      
                      {/* 月份数据单元格 */}
                      {uniqueMonths.map((month) => (
                        <>
                          {selectedDataTypes.includes('sales') && (
                            <td 
                              key={`${month}-sales`} 
                              className="px-1 py-1.5 text-center"
                              style={{ verticalAlign: 'middle', minWidth: '40px' }}
                            >
                              <div className="flex flex-col items-center">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(row[month] as number)}</p>
                                {/* 计算当月销量占比 - 销量为0则不显示 */}
                                {(() => {
                                  const companyMonthlySales = companyMonthlyTotalSales[row.company]?.[month] || 0;
                                  const monthPercentage = calculatePercentage(row[month] as number, companyMonthlySales);
                                  return monthPercentage ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{monthPercentage}</p>
                                  ) : null;
                                })()}
                              </div>
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
                        {/* 计算总计百分比 - 该厂商该价格区间总销量占该厂商总销量的比例 - 销量为0则不显示 */}
                        {(() => {
                          // 计算该厂商的总销量
                          const companyTotalSales = companyMonthlyTotalSales[row.company] 
                            ? Object.values(companyMonthlyTotalSales[row.company]).reduce((sum, sales) => sum + sales, 0)
                            : 0;
                          const totalPercentage = calculatePercentage(row.totalSales as number, companyTotalSales);
                          return totalPercentage ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{totalPercentage}</p>
                          ) : null;
                        })()}
                      </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={uniqueMonths.length * selectedDataTypes.length + 3} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* 说明信息 */}
       <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>注：销量数据基于各车型最低价格进行分类统计，展示各车企在不同价格区间的月度销量明细。相同厂商的单元格已合并显示。</p>
        <p className="mt-1">说明：2025年1月不显示环比数据，2025年全年不显示同比数据，使用"-"代替。</p>
      </div>
    </motion.div>
  );
}

export default PriceRangeTable;