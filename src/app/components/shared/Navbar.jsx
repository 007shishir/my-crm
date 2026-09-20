import React from 'react';
import Link from 'next/link';

const Navbar = () => {
  return (
    <div className="navbar bg-base-100 border-b border-base-200 px-4 md:px-8">
      {/* Mobile Menu & Logo */}
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 font-medium">
            <li><Link href="/buy">BUY</Link></li>
            <li><Link href="/rent">RENT</Link></li>
            <li><Link href="/commercial">COMMERCIAL</Link></li>
            <li><Link href="/pricing">PRICING</Link></li>
          </ul>
        </div>
        <Link href="/" className="text-2xl font-black tracking-tighter text-primary">
          NESTVIBE
        </Link>
      </div>

      {/* Desktop Menu */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-2 font-bold text-sm">
          <li><Link href="/buy" className="hover:text-primary">BUY</Link></li>
          <li><Link href="/rent" className="hover:text-primary">RENT</Link></li>
          <li><Link href="/commercial" className="hover:text-primary">COMMERCIAL</Link></li>
          <li><Link href="/pricing" className="hover:text-primary">PRICING</Link></li>
        </ul>
      </div>

      {/* Profile & CTA */}
      <div className="navbar-end gap-2">
        <Link href="/sell" className="btn btn-primary btn-sm hidden md:flex font-bold">
          SELL YOUR PROPERTY
        </Link>
        
        {/* CRM User Dropdown */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar online">
            <div className="w-10 rounded-full border-2 border-primary">
              <img alt="User Avatar" src="https://i.pravatar.cc/150?u=nestvibe" />
            </div>
          </div>
          <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200">
            <li className="px-4 py-2 border-b border-base-200 mb-2">
              <span className="font-bold block">Admin Nest</span>
              <span className="text-xs opacity-60">admin@nestvibe.xyz</span>
            </li>
            <li><Link href="/dashboard">CRM Dashboard</Link></li>
            <li><Link href="/messages" className="justify-between">Inbox <span className="badge badge-primary">New</span></Link></li>
            <li><Link href="/settings">Settings</Link></li>
            <li><button className="text-error font-bold">Logout</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;