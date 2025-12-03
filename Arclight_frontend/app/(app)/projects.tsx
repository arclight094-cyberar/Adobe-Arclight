import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Project {
  id: number;
  name: string;
  date: string;
}

const initialProjects: Project[] = [
  { id: 1, name: 'project 1', date: 'yesterday' },
  { id: 2, name: 'project 2', date: 'Sunday' },
  { id: 3, name: 'project 3', date: 'Jan 1' },
  { id: 4, name: 'project 4', date: 'Dec 25, 2025' },
  { id: 5, name: 'project 5', date: 'Oct 26, 2024' },
  { id: 6, name: 'project 6', date: 'Oct 3, 07' },
  { id: 7, name: 'project 7', date: 'Nov 15' },
  { id: 8, name: 'project 8', date: 'Aug 8, 2023' },
];

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects] = useState<Project[]>(initialProjects);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const { colors, isDark } = useTheme();

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCardWidth = () => {
    const padding = 40;
    const gap = 20;
    const availableWidth = SCREEN_WIDTH - padding;
    const cardWidth = (availableWidth - gap) / 2;
    return cardWidth;
  };

  const handleRename = (id: number) => {
    console.log('Rename project', id);
  };

  const handleDelete = (id: number) => {
    console.log('Delete project', id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1A1A1A' : '#E8E5D8' }]} edges={['top']}>
      <Navbar screenName="PROJECTS" />

      {/* BACKDROP when menu open */}
      {openMenuId !== null && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpenMenuId(null)}
        />
      )}

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF', borderColor: isDark ? '#3A3A3A' : '#D0CDB8', borderWidth: 1 }]}>
        <Feather name="search" size={20} color={isDark ? '#B0B0B0' : '#666666'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}
          placeholder="Search"
          placeholderTextColor={isDark ? '#808080' : '#999999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* GRID */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {filteredProjects.map((project) => (
            <View
              key={project.id}
              style={[styles.projectCard, { width: getCardWidth() }]}
            >
              {/* Three dots menu button */}
              <TouchableOpacity
                style={styles.optionsButton}
                onPress={() =>
                  setOpenMenuId(openMenuId === project.id ? null : project.id)
                }
              >
                <Text style={[styles.optionsText, { color: isDark ? '#B0B0B0' : '#666666' }]}>⋮</Text>
              </TouchableOpacity>

              {/* Menu itself */}
              {openMenuId === project.id && (
                <View style={[styles.optionsMenu, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      setOpenMenuId(null);
                      handleRename(project.id);
                    }}
                  >
                    <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.optionItem, [styles.lastOptionItem, { borderTopColor: isDark ? '#3A3A3A' : '#E0E0E0' }]]}
                    onPress={() => {
                      setOpenMenuId(null);
                      handleDelete(project.id);
                    }}
                  >
                    <Text style={[styles.optionText, { color: colors.status.error }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* MAIN CARD */}
              <TouchableOpacity activeOpacity={0.8}>
                <View style={[styles.projectThumbnail, { backgroundColor: isDark ? '#E8E5D8' : '#2A2A2A' }]} />
                <Text style={[styles.projectName, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>{project.name}</Text>
                <Text style={[styles.projectDate, { color: isDark ? '#B0B0B0' : '#666666' }]}>{project.date}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* BACKDROP */
  backdrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },

  /* SEARCH */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontFamily: 'geistmono',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  /* GRID */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },

  /* CARD */
  projectCard: {
    marginBottom: 20,
    position: 'relative',
  },

  projectThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 8,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
    fontFamily: 'geistmono',
  },
  projectDate: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'geistmono',
  },

  /* OPTIONS MENU */
  optionsButton: {
    position: 'absolute',
    top: 1,
    right: 8,
    zIndex: 10,
    padding: 6,
  },
  optionsText: {
    fontSize: 24,
    fontFamily: 'geistmono',
  },
  optionsMenu: {
    position: 'absolute',
    top: 28,
    right: 4,
    borderRadius: 10,
    paddingVertical: 6,
    width: 120,
    zIndex: 20,
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  lastOptionItem: {
    borderTopWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'geistmono',
  },
});

