import React from "react";

export const Loader = () => {
  return (
    <div className="flex justify-center items-center w-full h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
    </div>
  );
};

export const SkeletonVideoCard = () => {
  return (
    <div className="flex flex-col gap-2 w-full animate-pulse">
      <div className="w-full aspect-video rounded-xl bg-[#1a1a1a]"></div>
      <div className="flex gap-3 items-start mt-2">
        <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex-shrink-0"></div>
        <div className="flex flex-col gap-2 w-full mt-1">
          <div className="h-3 bg-[#1a1a1a] rounded w-full"></div>
          <div className="h-3 bg-[#1a1a1a] rounded w-3/4"></div>
          <div className="h-2.5 bg-[#1a1a1a] rounded w-1/2 mt-1"></div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonVideoCard key={i} />
      ))}
    </div>
  );
};
