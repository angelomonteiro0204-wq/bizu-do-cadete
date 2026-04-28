import { Pressable, View, Text } from 'react-native';
import { useThemeContext } from '@/lib/theme-provider';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors();

  const toggleTheme = () => {
    setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
  };

  return (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View className="flex-row items-center gap-2">
        <Text
          className={cn(
            'text-sm font-semibold',
            colorScheme === 'light' ? 'text-primary' : 'text-muted'
          )}
        >
          ☀️
        </Text>
        <Text className="text-xs text-muted">/</Text>
        <Text
          className={cn(
            'text-sm font-semibold',
            colorScheme === 'dark' ? 'text-accent' : 'text-muted'
          )}
        >
          🌙
        </Text>
      </View>
    </Pressable>
  );
}
