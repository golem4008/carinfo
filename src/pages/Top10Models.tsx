import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { DateRange } from '../types';
import DateFilter from '../components/DateFilter';
import { useLocation } from 'react-router-dom';
import ViewSelector from '../components/ViewSelector';
import { getCurrentCarModelData, carCompanies, getLatestModelPrice } from '../mocks/data';
import ModelComparisonChart from '../components/ModelComparisonChart';
import { energyTypes } from '../mocks/energyTypes';

// 定义价格区间
const PRICE_RANGES = [
  { name: '10万以下', min: 0, max: 10, color: '#3b82f6' },
  { name: '10~15万', min: 10, max: 15, color: '#10b981' },
  { name: '15~25万', min: 15, max: 25, color: '#f59e0b' },
  { name: '25~35万', min: 25, max: 35, color: '#8b5cf6' },
  { name: '35~50万', min: 35, max: 50, color: '#ec4899' },
  { name: '50万以上', min: 50, max: Infinity, color: '#ef4444' }
];

// 车型数据接口
interface CarModel {
  name: string;
  sales: number;
  brand: string;
  manufacturer: string;
  color: string;
  energyType: string;
  price: string;
  brandModelName: string; // 品牌+车型名称
  minPrice: number; // 最小价格，用于筛选
  maxPrice: number; // 最大价格，用于筛选
}

export default function Top10Models() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  // 从路由状态中获取日期范围，如果没有则使用默认值
  const initialDateRange = location.state?.dateRange || {
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [filteredData, setFilteredData] = useState<CarModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 新增：能源类型筛选状态，默认全选
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState<string[]>(energyTypes.map(type => type.name));
  // 新增：表格高度控制状态
  const [tableHeight, setTableHeight] = useState<number>(600);
  const [showEnergyDropdown, setShowEnergyDropdown] = useState<boolean>(false);
  
  // 新增：价格区间筛选状态，默认全选
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(PRICE_RANGES.map(range => range.name));
  const [showPriceDropdown, setShowPriceDropdown] = useState<boolean>(false);
  
  // 新增：厂商筛选状态，默认全选
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(carCompanies.map(company => company.name));
  const [showCompanyDropdown, setShowCompanyDropdown] = useState<boolean>(false);
  // 新增：厂商搜索关键词
  const [companySearchTerm, setCompanySearchTerm] = useState<string>('');
  
  // 新增：品牌筛选状态，默认全选
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState<boolean>(false);
  const [allBrands, setAllBrands] = useState<string[]>([]); // 所有可用的品牌列表
  // 新增：品牌搜索关键词
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>('');

  // 生成年份和月份选项
  const yearOptions = Array.from({ length: 3 }, (_, i) => (2024 + i).toString());
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    return monthNum < 10 ? `0${monthNum}` : monthNum.toString();
  });

  // 使用统一的数据来源 - 与其他页面保持一致
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        // 使用与其他页面相同的数据来源
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 提取所有品牌
        const brands = Array.from(new Set(carModelData.map(item => item.brand)));
        setAllBrands(brands);
        
        // 按车型名称聚合销量数据
        const modelSalesMap = new Map<string, CarModel>();
        
        carModelData.forEach(item => {
          const key = `${item.manufacturer}-${item.brand}-${item.modelName}`;
          if (modelSalesMap.has(key)) {
            // 如果车型已存在，累加销量
            const existingModel = modelSalesMap.get(key)!;
            existingModel.sales += item.sales;
          } else {
              // 获取该车型在时间范围内的最新价格，用于价格区间分类
            const latestPrice = getLatestModelPrice(
              carModelData,
              item.manufacturer,
              item.brand,
              item.modelName,
              dateRange
            );
            
            // 如果车型不存在，创建新记录，使用最新价格
            modelSalesMap.set(key, {
              name: item.modelName,
              sales: item.sales,
              brand: item.brand,
              manufacturer: item.manufacturer,
              color: getManufacturerColor(item.manufacturer),
              energyType: item.energyType,
              price: `${latestPrice?.minPrice.toFixed(2)}-${latestPrice?.maxPrice.toFixed(2)}万`,
              brandModelName: `${item.brand} ${item.modelName}`, // 品牌+车型名称
              minPrice: latestPrice?.minPrice || item.minPrice, // 保存最小价格用于筛选
              maxPrice: latestPrice?.maxPrice || item.maxPrice  // 保存最大价格用于筛选
            });
          }
        });
        
        // 转换为数组并按销量降序排序，显示所有车型
        const sortedModels = Array.from(modelSalesMap.values())
          .sort((a, b) => b.sales - a.sales);
        
        // 应用所有筛选条件
        const filteredModels = sortedModels.filter(model => {
          // 能源类型筛选
          const energyMatch = selectedEnergyTypes.includes(model.energyType);
          
          // 厂商筛选
          const companyMatch = selectedCompanies.includes(model.manufacturer);
          
          // 品牌筛选
          const brandMatch = selectedBrands.length > 0 ? selectedBrands.includes(model.brand) : true;
          
          // 价格区间筛选
          const avgPrice = (model.minPrice + model.maxPrice) / 2;
          const priceRange = PRICE_RANGES.find(range => 
            avgPrice >= range.min && avgPrice < range.max
          );
          const priceMatch = priceRange ? selectedPriceRanges.includes(priceRange.name) : true;
          
          return energyMatch && companyMatch && brandMatch && priceMatch;
        });
        
        setFilteredData(filteredModels);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [dateRange, selectedEnergyTypes, selectedPriceRanges, selectedCompanies, selectedBrands]); // 当任何筛选条件变化时重新加载数据

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    // 日期范围变化时，useEffect会自动重新加载数据
  };
  
  // 新增：处理能源类型选择变化
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
  
  // 新增：全选能源类型
  const selectAllEnergyTypes = () => {
    setSelectedEnergyTypes(energyTypes.map(type => type.name));
  };
  
  // 新增：清除所有能源类型选择
  const clearAllEnergyTypes = () => {
    // 确保至少保留一个选中项
    if (energyTypes.length > 0) {
      setSelectedEnergyTypes([energyTypes[0].name]);
    }
  };
  
// 根据厂商名称获取颜色
const getManufacturerColor = (manufacturer: string): string => {
  const colorMap: Record<string, string> = {
    '特斯拉': '#E82127',
    '比亚迪': '#0066B3',
    '大众': '#000000',
    '丰田': '#EB0A1E',
    '本田': '#FF3333',
    '吉利': '#2C3E50',
    '理想': '#6b7280',
    '长安': '#10b981',
  };
  return colorMap[manufacturer] || '#8b5cf6'; // 默认颜色
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

// 处理厂商选择变化
const handleCompanyToggle = (company: string) => {
  setSelectedCompanies(prev => {
    if (prev.includes(company)) {
      // 确保至少保留一个选中项
      if (prev.length > 1) {
        return prev.filter(c => c !== company);
      }
      return prev;
    } else {
      return [...prev, company];
    }
  });
};

// 全选厂商
const selectAllCompanies = () => {
  setSelectedCompanies(carCompanies.map(company => company.name));
};

// 清除所有厂商选择
const clearAllCompanies = () => {
  if (carCompanies.length > 0) {
    setSelectedCompanies([carCompanies[0].name]);
  }
};

// 处理品牌选择变化
const handleBrandToggle = (brand: string) => {
  setSelectedBrands(prev => {
    if (prev.includes(brand)) {
      // 品牌可以全部取消选择
      return prev.filter(b => b !== brand);
    } else {
      return [...prev, brand];
    }
  });
};

// 全选品牌
const selectAllBrands = () => {
  setSelectedBrands(allBrands);
};

// 清除所有品牌选择
const clearAllBrands = () => {
  setSelectedBrands([]);
};

// 获取过滤后的厂商列表
const getFilteredCompanies = () => {
  if (!companySearchTerm) return carCompanies;
  return carCompanies.filter(company => 
    company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
  );
};

// 获取过滤后的品牌列表
const getFilteredBrands = () => {
  if (!brandSearchTerm) return allBrands;
  return allBrands.filter(brand => 
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );
};

  // 页面容器动画配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // 头部动画配置
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, showPercentage = false }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{data.brand} ({data.manufacturer})</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">能源类型: {data.energyType}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">最新价格: {data.price}</p>
           <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatNumber(data.sales)} 辆{showPercentage && payload.length > 0 ? ` (${((data.sales / payload.reduce((sum: number, entry: any) => sum + entry.value, 0)) * 100).toFixed(1)}%)` : ''}</p>
        </div>
      );
    }
    return null;
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

  return (
     <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${theme}`}>
      <motion.div 
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 页面头部 */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          variants={headerVariants}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              车企销量数据分析平台
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              全面分析各车企销量表现、市场份额和增长趋势
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow mt-4 md:mt-0"
            aria-label="切换主题"
          >
            <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-gray-700 dark:text-gray-300`}></i>
          </button>
        </motion.div>

        {/* 视图选择器 */}
        <ViewSelector currentView="top-10-models" dateRange={dateRange} />

         {/* 视图标题 */}
        <motion.div 
          className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fa-solid fa-crown text-amber-500 mr-2"></i>
            车型销量
          </h2>
        </motion.div>

         {/* 合并后的TOP10车型销量排名和详细数据模块 - 所选范围 */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">全车型销量排名</h3>
             
              {/* 第一行：厂商、品牌、价格区间、能源类型筛选器 */}
              <div className="flex flex-wrap gap-4 w-full mb-4">
                 {/* 厂商筛选下拉框 */}
                 <div className="relative flex-1 min-w-[180px]">
                   <button
                     onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                     className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                   >
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                       厂商 ({selectedCompanies.length}/{carCompanies.length})
                     </span>
                     <span className={`text-sm transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`}>
                       <i className="fa-solid fa-chevron-down"></i>
                     </span>
                   </button>
                   {showCompanyDropdown && (
                     <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                       <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                         <button
                           onClick={selectAllCompanies}
                           className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                         >
                           全选
                         </button>
                         <button
                           onClick={clearAllCompanies}
                           className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                         >
                           清除
                         </button>
                       </div>
                       <div className="p-2">
                         <div className="mb-2">
                           <input
                             type="text"
                             placeholder="搜索厂商..."
                             value={companySearchTerm}
                             onChange={(e) => setCompanySearchTerm(e.target.value)}
                             className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-blue-500"
                           />
                         </div>
                         {getFilteredCompanies().map(company => (
                           <label
                             key={company.id}
                             className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                           >
                             <input
                               type="checkbox"
                               checked={selectedCompanies.includes(company.name)}
                               onChange={() => handleCompanyToggle(company.name)}
                               className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                               disabled={selectedCompanies.length === 1 && selectedCompanies[0] === company.name}
                             />
                             <div className="ml-3 flex items-center">
                               <div 
                                 className="w-6 h-6 rounded-full mr-2 flex items-center justify-center"
                                 style={{ backgroundColor: company.color }}
                               >
                                 <span className="text-white text-xs">{company.name[0]}</span>
                               </div>
                               <span className="text-sm text-gray-700 dark:text-gray-300">{company.name}</span>
                             </div>
                           </label>
                         ))}
                         {getFilteredCompanies().length === 0 && (
                           <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                             没有找到匹配的厂商
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                 </div>

                 {/* 品牌筛选下拉框 */}
                 <div className="relative flex-1 min-w-[180px]">
                   <button
                     onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                     className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                   >
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                       品牌 ({selectedBrands.length > 0 ? selectedBrands.length : '全部'}/{allBrands.length})
                     </span>
                     <span className={`text-sm transition-transform ${showBrandDropdown ? 'rotate-180' : ''}`}>
                       <i className="fa-solid fa-chevron-down"></i>
                     </span>
                   </button>
                   {showBrandDropdown && (
                     <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                       <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                         <button
                           onClick={selectAllBrands}
                           className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                         >
                           全选
                         </button>
                         <button
                           onClick={clearAllBrands}
                           className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                         >
                           清除
                         </button>
                       </div>
                       <div className="p-2">
                         <div className="mb-2">
                           <input
                             type="text"
                             placeholder="搜索品牌..."
                             value={brandSearchTerm}
                             onChange={(e) => setBrandSearchTerm(e.target.value)}
                             className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-blue-500"
                           />
                         </div>
                         {getFilteredBrands().map((brand, index) => (
                           <label
                             key={index}
                             className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                           >
                             <input
                               type="checkbox"
                               checked={selectedBrands.includes(brand)}
                               onChange={() => handleBrandToggle(brand)}
                               className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                             />
                             <div className="ml-3 flex items-center">
                               <span className="text-sm text-gray-700 dark:text-gray-300">{brand}</span>
                             </div>
                           </label>
                         ))}
                         {getFilteredBrands().length === 0 && (
                           <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                             没有找到匹配的品牌
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                </div>

                {/* 价格区间筛选下拉框 */}
                <div className="relative flex-1 min-w-[180px]">
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
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: range.color }}
                              ></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{range.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 能源类型筛选下拉框 */}
                <div className="relative flex-1 min-w-[180px]">
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
              </div>
              
              {/* 第二行：起始年月选择 */}
              <div className="w-full">
                <DateFilter 
                 onDateRangeChange={handleDateRangeChange}
                 defaultStartDate={dateRange.startDate}
                 defaultEndDate={dateRange.endDate}
               />
              </div>
           </div>
          

          
          {/* 详细数据表格部分 - 调整单元格宽度 */}
          {/* 表格高度控制滑块 */}
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="tableHeight" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              表格高度: {tableHeight}px
            </label>
            <input
              id="tableHeight"
              type="range"
              min="300"
              max="900"
              step="50"
              value={tableHeight}
              onChange={(e) => setTableHeight(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                WebkitAppearance: 'none',
                appearance: 'none',
                background: 'linear-gradient(to right, #3b82f6 var(--value), #e5e7eb var(--value))'
              }}
            />
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: `${tableHeight}px`, minHeight: '300px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : filteredData.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '40px' }}>
                      排名
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '80px' }}>
                      厂商
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '80px' }}>
                      品牌
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                      车型名称
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '80px' }}>
                      能源类型
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '80px' }}>
                      价格
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '80px' }}>
                      销量
                    </th>
                    <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                      占比
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.map((model, index) => {
                    const totalSales = filteredData.reduce((sum, item) => sum + item.sales, 0);
                    const percentage = ((model.sales / totalSales) * 100).toFixed(1);
                    const energyInfo = getEnergyTypeInfo(model.energyType);
                    
                    return (
                      <tr key={model.name} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            index === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                            index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            index === 2 ? 'bg-amber-50 text-amber-700 dark:bg-amber-800/20 dark:text-amber-200' :
                            'bg-gray-50 text-gray-700 dark:bg-gray-750 dark:text-gray-300'
                          }`}>
                            <span className="font-medium text-xs">{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white inline-block max-w-[80px] leading-relaxed whitespace-normal">{model.manufacturer}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white inline-block max-w-[80px] leading-relaxed whitespace-normal">{model.brand}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{model.name}</span>
                        </td>

                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${energyInfo.color}`}>
                            <i className={`fa-solid ${energyInfo.icon} mr-1 text-xs`}></i>
                            <span className="text-xs">{model.energyType}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white">{model.price}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(model.sales)}</div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          <div className="inline-flex items-center">
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div 
                                className="bg-blue-600 h-2.5 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-xs text-gray-900 dark:text-white">{percentage}%</span>
                          </div>
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
        </motion.div>

         {/* 此处已移除单月车型销量模块 */}

         {/* 车型销量对比分析模块 */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ModelComparisonChart dateRange={dateRange} />
        </motion.div>
        
        {/* 页脚 */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2026 车企销量数据分析平台 | 数据更新时间: {new Date().toLocaleDateString()}
          </p>
        </div>
      </motion.div>
    </div>
  );
}