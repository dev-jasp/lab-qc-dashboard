import Button from "../features/Button";


const Header = () => {
  return (
    <header className="flex-col text-start ">
     <div className="flex py-4 px-3 rounded-xl bg-green-800 text-white text-[17px] font-bold ">
        <h1 className="">
          Vaccine Preventable Disease Referral Laboratory
        </h1>
          <img src="" alt="Department of Laboratory Medicine Logo" />
          <img src="" alt="Department of Health Logo" />

          
     </div>
        <div className="text-xl text-center mt-20 text-slate-950 font-bold ">
        <p className=" mt-1">
          Quality Control Chart
        </p>
        </div>
    
    </header>
  );
};



export default Header;