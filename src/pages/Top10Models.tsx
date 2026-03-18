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

// 车型数据接口（扩展字段）
interface CarModel {
  name: string;
  sales: number;
  brand: string;
  manufacturer: string;
  color: string;
  energyType: string;
  energyTypes?: Set<string>;
  price: string;
  brandModelName: string;
  minPrice: number;
  maxPrice: number;
}

export default function Top10Models() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  // 初始日期范围
  const initialDateRange = location.state?.dateRange || {
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  };
  
  // 基础状态
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [filteredData, setFilteredData] = useState<CarModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState<string[]>(energyTypes.map(type => type.name));
  const [tableHeight, setTableHeight] = useState<number>(600);
  const [showEnergyDropdown, setShowEnergyDropdown] = useState<boolean>(false);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(PRICE_RANGES.map(range => range.name));
  const [showPriceDropdown, setShowPriceDropdown] = useState<boolean>(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(carCompanies.map(company => company.name));
  const [showCompanyDropdown, setShowCompanyDropdown] = useState<boolean>(false);
  const [companySearchTerm, setCompanySearchTerm] = useState<string>('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState<boolean>(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>('');
  const [isMergeSameModel, setIsMergeSameModel] = useState(false);

  // 🔴 新增：厂商-品牌联动相关状态
  const [manufacturerBrandMap, setManufacturerBrandMap] = useState<Record<string, string[]>>({}); // 厂商→品牌映射
  const [filteredBrands, setFilteredBrands] = useState<string[]>([]); // 选中厂商后的品牌列表

  // 加载数据（核心逻辑）
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 🔴 构建厂商-品牌映射（核心联动基础）
        const brandMap: Record<string, Set<string>> = {};
        carModelData.forEach(item => {
          if (!brandMap[item.manufacturer]) {
            brandMap[item.manufacturer] = new Set();
          }
          brandMap[item.manufacturer].add(item.brand);
        });
        // 转换为数组格式
        const formattedMap: Record<string, string[]> = {};
        Object.keys(brandMap).forEach(manufacturer => {
          formattedMap[manufacturer] = Array.from(brandMap[manufacturer]);
        });
        setManufacturerBrandMap(formattedMap);

        // 数据聚合（支持合并/不合并）
        const modelSalesMap = new Map<string, CarModel>();
        carModelData.forEach(item => {
          const key = isMergeSameModel
            ? `${item.manufacturer}-${item.brand}-${item.modelName}`
            : `${item.manufacturer}-${item.brand}-${item.modelName}-${item.energyType}`;

          const latestPrice = getLatestModelPrice(
            carModelData,
            item.manufacturer,
            item.brand,
            item.modelName,
            dateRange
          );

          if (modelSalesMap.has(key)) {
            const exist = modelSalesMap.get(key)!;
            exist.sales += item.sales;
            if (isMergeSameModel) {
              exist.energyTypes?.add(item.energyType);
            }
          } else {
            modelSalesMap.set(key, {
              name: item.modelName,
              sales: item.sales,
              brand: item.brand,
              manufacturer: item.manufacturer,
              color: getManufacturerColor(item.manufacturer),
              energyType: item.energyType,
              energyTypes: new Set([item.energyType]),
              price: `${latestPrice?.minPrice.toFixed(2)}-${latestPrice?.maxPrice.toFixed(2)}万`,
              brandModelName: `${item.brand} ${item.modelName}`,
              minPrice: latestPrice?.minPrice || item.minPrice,
              maxPrice: latestPrice?.maxPrice || item.maxPrice,
            });
          }
        });

        // 处理能源类型显示
        const sortedModels = Array.from(modelSalesMap.values())
          .map(item => ({
            ...item,
            energyType: isMergeSameModel 
              ? Array.from(item.energyTypes || new Set()).join('、') 
              : item.energyType
          }))
          .sort((a, b) => b.sales - a.sales);

        // 筛选逻辑
        const filteredModels = sortedModels.filter(model => {
          const energyMatch = selectedEnergyTypes.some(e => model.energyType.includes(e));
          const companyMatch = selectedCompanies.includes(model.manufacturer);
          const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(model.brand);
          const avgPrice = (model.minPrice + model.maxPrice) / 2;
          const priceRange = PRICE_RANGES.find(r => avgPrice >= r.min && avgPrice < r.max);
          const priceMatch = !priceRange || selectedPriceRanges.includes(priceRange.name);

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
  }, [dateRange, selectedEnergyTypes, selectedPriceRanges, selectedCompanies, selectedBrands, isMergeSameModel]);

  // 🔴 厂商-品牌联动核心逻辑：选中厂商变化时，过滤品牌列表
  useEffect(() => {
    if (Object.keys(manufacturerBrandMap).length === 0) return;
    
    // 收集所有选中厂商对应的品牌
    const currentBrands = new Set<string>();
    selectedCompanies.forEach(manufacturer => {
      if (manufacturerBrandMap[manufacturer]) {
        manufacturerBrandMap[manufacturer].forEach(brand => currentBrands.add(brand));
      }
    });
    const brandList = Array.from(currentBrands);
    setFilteredBrands(brandList);
    
    // 清理无效的品牌选中项（选中的品牌不在当前厂商列表中则清空）
    if (selectedBrands.length > 0) {
      const validBrands = selectedBrands.filter(brand => currentBrands.has(brand));
      if (validBrands.length !== selectedBrands.length) {
        setSelectedBrands(validBrands);
      }
    }
  }, [selectedCompanies, manufacturerBrandMap, selectedBrands]);

  // 日期变更
  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };
  
  // 能源类型筛选
  const handleEnergyTypeToggle = (energyType: string) => {
    setSelectedEnergyTypes(prev => prev.includes(energyType) 
      ? (prev.length > 1 ? prev.filter(type => type !== energyType) : prev) 
      : [...prev, energyType]);
  };
  const selectAllEnergyTypes = () => setSelectedEnergyTypes(energyTypes.map(type => type.name));
  const clearAllEnergyTypes = () => setSelectedEnergyTypes(energyTypes.length > 0 ? [energyTypes[0].name] : []);

  // 厂商颜色映射
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
    return colorMap[manufacturer] || '#8b5cf6';
  };

  // 价格区间筛选
  const handlePriceRangeToggle = (priceRange: string) => {
    setSelectedPriceRanges(prev => prev.includes(priceRange) 
      ? (prev.length > 1 ? prev.filter(range => range !== priceRange) : prev) 
      : [...prev, priceRange]);
  };
  const selectAllPriceRanges = () => setSelectedPriceRanges(PRICE_RANGES.map(range => range.name));
  const clearAllPriceRanges = () => setSelectedPriceRanges(PRICE_RANGES.length > 0 ? [PRICE_RANGES[0].name] : []);

  // 厂商筛选
  const handleCompanyToggle = (company: string) => {
    setSelectedCompanies(prev => prev.includes(company) 
      ? (prev.length > 1 ? prev.filter(c => c !== company) : prev) 
      : [...prev, company]);
  };
  const selectAllCompanies = () => setSelectedCompanies(carCompanies.map(company => company.name));
  const clearAllCompanies = () => setSelectedCompanies(carCompanies.length > 0 ? [carCompanies[0].name] : []);

  // 🔴 品牌筛选（基于联动后的品牌列表）
  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };
  const selectAllBrands = () => setSelectedBrands(filteredBrands); // 全选当前厂商下的品牌
  const clearAllBrands = () => setSelectedBrands([]);

  // 过滤厂商/品牌列表
  const getFilteredCompanies = () => {
    if (!companySearchTerm) return carCompanies;
    return carCompanies.filter(company => 
      company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
    );
  };
  
  // 🔴 品牌过滤基于联动后的列表
  const getFilteredBrands = () => {
    if (!brandSearchTerm) return filteredBrands;
    return filteredBrands.filter(brand => 
      brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
    );
  };

  // 数字格式化
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 🔴 优化：获取单个能源类型的样式（用于多标签显示）
  const getEnergyTypeInfo = (energyType: string) => {
    const energyTypeConfig = energyTypes.find(type => type.name === energyType);
    if (energyTypeConfig) {
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

  // 🔴 渲染能源类型多标签
  const renderEnergyTags = (energyStr: string) => {
    return energyStr.split('、').map((energy, idx) => {
      const info = getEnergyTypeInfo(energy);
      return (
        <div 
          key={idx}
          className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${info.color} mr-1 mb-1`}
        >
          <i className={`fa-solid ${info.icon} mr-1 text-xs`}></i>
          <span className="text-xs">{energy}</span>
        </div>
      );
    });
  };

  // 页面渲染
  return (
     <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${theme}`}>
      <motion.div 
        className="container mx-auto px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }}
      >
        {/* 页面头部 */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
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

        {/* 销量排名模块 */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">全车型销量排名</h3>
           
            {/* 筛选器行 */}
            <div className="flex flex-wrap gap-4 w-full mb-4">
               {/* 厂商筛选 */}
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

               {/* 🔴 品牌筛选（联动后） */}
               <div className="relative flex-1 min-w-[180px]">
                 <button
                   onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                   className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                 >
                   <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                     品牌 ({selectedBrands.length > 0 ? selectedBrands.length : '全部'}/{filteredBrands.length})
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

              {/* 价格区间筛选 */}
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

              {/* 能源类型筛选 */}
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
            
            {/* 日期筛选 */}
            <div className="w-full">
              <DateFilter 
               onDateRangeChange={handleDateRangeChange}
               defaultStartDate={dateRange.startDate}
               defaultEndDate={dateRange.endDate}
             />
            </div>
         </div>
        
        {/* 表格高度 + 合并开关 */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {/* 表格高度滑块 */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
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

          {/* 合并同车型开关 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mergeSameModel"
              checked={isMergeSameModel}
              onChange={(e) => setIsMergeSameModel(e.target.checked)}
              className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <label 
              htmlFor="mergeSameModel"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              合并同车型不同能源销量
            </label>
          </div>
        </div>

        {/* 表格容器 */}
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
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '120px' }}>
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
                  
                  return (
                    <tr 
                      key={`${model.manufacturer}-${model.brand}-${model.name}-${model.energyType}-${index}`} 
                      className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                    >
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
                      {/* 🔴 渲染多颜色能源类型标签 */}
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <div className="flex justify-center items-center flex-wrap">
                          {renderEnergyTags(model.energyType)}
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

      {/* 销量对比图表 */}
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