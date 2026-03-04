import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DateRange } from '../types';

// 视图选项定义
interface ViewOption {
  id: string;
  title: string;
  route: string;
  icon: string;
  color: string;
}

interface ViewSelectorProps {
  currentView: string;
  dateRange?: DateRange;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ currentView, dateRange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 定义所有视图选项
  const viewOptions: ViewOption[] = [
    {
      id: 'overall-sales',
      title: '车企总体销量',
      route: '/',
      icon: 'fa-chart-line',
      color: 'bg-blue-500'
    },
    {
      id: 'price-segmented',
      title: '价格区分销量',
      route: '/price-segmented',
      icon: 'fa-tag',
      color: 'bg-green-500'
    },
    {
      id: 'single-company',
      title: '单车企数据',
      route: '/single-company',
      icon: 'fa-building',
      color: 'bg-indigo-500'
    },
  {
      id: 'top-10-models',
      title: '车型销量',
      route: '/top-10-models',
      icon: 'fa-crown',
      color: 'bg-amber-500'
    },
    {
      id: 'energy-type',
      title: '动力类型区分销量',
      route: '/energy-type',
      icon: 'fa-bolt',
      color: 'bg-purple-500'
    },
    {
      id: 'vehicle-type',
      title: '车辆类型区分销量',
      route: '/vehicle-type',
      icon: 'fa-car-side',
      color: 'bg-red-500'
    },
     {
        id: 'new-energy-companies',
        title: '新势力品牌情况',
        route: '/new-energy-companies',
        icon: 'fa-leaf',
        color: 'bg-emerald-500'
      }
  ];

  const handleViewChange = (route: string) => {
    // 保留日期范围状态并导航到新视图
    navigate(route, { 
      state: { 
        dateRange: dateRange || location.state?.dateRange
      } 
    });
  };

  // 卡片动画配置
  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    active: { scale: 0.98, transition: { duration: 0.1 } }
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        分析视图选择
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {viewOptions.map((option, index) => (
          <motion.div
            key={option.id}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="active"
            transition={{ delay: index * 0.05 }}
            className={`cursor-pointer rounded-xl shadow-md overflow-hidden border-2 transition-all duration-300 ${
              currentView === option.id ? `border-${option.color.replace('bg-', '')} shadow-lg` : 'border-transparent'
            }`}
            onClick={() => handleViewChange(option.route)}
          >
            <div className={`p-3 bg-white dark:bg-gray-800 transition-colors ${
              currentView === option.id ? 'bg-opacity-10' : ''
            }`}>
              <div className="flex items-center">
                <div className={`${option.color} p-2 rounded-lg text-white mr-2`}>
                  <i className={`fa-solid ${option.icon} text-sm`}></i>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-900 dark:text-white">{option.title}</h4>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 说明信息 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          <i className="fa-solid fa-circle-info mr-1"></i>
          选择不同的分析视图查看汽车销售数据的不同维度，点击相应卡片进行切换。
        </p>
      </div>
    </div>
  );
};

export default ViewSelector;