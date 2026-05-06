import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({ theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="flex items-center gap-3"
    >
      <div className={`w-12 h-12 ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden`}>
        <div className="absolute inset-0 flex gap-1 p-2">
          <div className="flex-1 bg-white rounded-sm h-full" />
          <div className="flex-1 bg-white rounded-sm h-full" />
          <div className="flex-1 bg-white rounded-sm h-full" />
        </div>
        <div className="absolute top-0 flex gap-1 p-2 w-full justify-center">
            <div className="w-2 h-4 bg-slate-800 rounded-b-sm mx-1" />
            <div className="w-2 h-4 bg-slate-800 rounded-b-sm mx-1" />
        </div>
      </div>
      <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'} tracking-tight`}>
        Piano<span className="text-indigo-500">Flow</span>
      </h1>
    </motion.div>
  );
};

export default Logo;
