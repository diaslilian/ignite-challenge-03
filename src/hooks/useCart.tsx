import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const checkIfHaveProductInStock = async (
    productId: number,
    amount: number
  ) => {
    const { data: stock } = await api.get<Stock>(`stock/${productId}`);
    if (stock.amount < Number(amount) + 1 || stock.amount === 0) {
      toast.error("Quantidade solicitada fora de estoque");
      return false;
    }
    return true;
  };

  const checkIfProductExists = async (productId: number) => {
    try {
      await api.get<Product>(`products/${productId}`);
    } catch {
      toast.error("Produto não existe");
    }
  };

  function saveCartOnLocalStorage(cart: Product[]) {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }

  const addProduct = async (productId: number) => {
    try {
      const productIndex: number = cart.findIndex(
        (product: Product) => product.id === productId
      );

      if (productIndex !== -1) {
        if (
          !(await checkIfHaveProductInStock(
            productId,
            cart[productIndex].amount
          ))
        ) {
          return;
        }

        const newCart = cart.map((product) =>
          product.id === productId
            ? {
                ...product,
                amount: product.amount + 1,
              }
            : product
        );

        setCart(newCart);
        saveCartOnLocalStorage(newCart);
      } else {
        await checkIfProductExists(productId);

        const { data: dataProduct } = await api.get(`/products/${productId}`);

        const newCart = [
          ...cart,
          {
            ...dataProduct,
            amount: 1,
          },
        ];

        setCart(newCart);
        saveCartOnLocalStorage(newCart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(
        (cartProduct) => cartProduct.id === productId
      );

      if (!productExists) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const updatedCart = cart.filter((cartItem) => cartItem.id !== productId);

      setCart(updatedCart);
      saveCartOnLocalStorage(updatedCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const response = await api.get(`/stock/${productId}`);
      const productAmount = response.data.amount;
      const stockNotAvailable = amount > productAmount;

      if (stockNotAvailable) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productExists = cart.some(
        (cartProduct) => cartProduct.id === productId
      );
      if (!productExists) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const updatedCart = cart.map((cartItem) =>
        cartItem.id === productId
          ? {
              ...cartItem,
              amount: amount,
            }
          : cartItem
      );

      setCart(updatedCart);
      saveCartOnLocalStorage(updatedCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
