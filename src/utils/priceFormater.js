
const priceFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});



export const formatPrice = (amount) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Fallback if the data passed is invalid or missing
    if (isNaN(numericAmount)) return '₦0.00'; 
    
    return priceFormatter.format(numericAmount);
};