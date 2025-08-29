type ButtonProps = {
    icon?: React.ReactNode; 

}; 

export const Button: React.FC<ButtonProps> = ({ icon,  }: ButtonProps) =>  {
    return (
        <button 
        className="width-20"
        > 
        {icon}
        </button>
    );
}; 

















