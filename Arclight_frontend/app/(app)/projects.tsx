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
    <SafeAreaView style={styles.container} edges={['top']}>
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
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#999"
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
                <Text style={styles.optionsText}>⋮</Text>
              </TouchableOpacity>

              {/* Menu itself */}
              {openMenuId === project.id && (
                <View style={styles.optionsMenu}>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      setOpenMenuId(null);
                      handleRename(project.id);
                    }}
                  >
                    <Text style={styles.optionText}>Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.optionItem, styles.lastOptionItem]}
                    onPress={() => {
                      setOpenMenuId(null);
                      handleDelete(project.id);
                    }}
                  >
                    <Text style={[styles.optionText, { color: '#ff4444' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* MAIN CARD */}
              <TouchableOpacity activeOpacity={0.8}>
                <View style={styles.projectThumbnail} />
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectDate}>{project.date}</Text>
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
    backgroundColor: '#E8E4DC',
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
    backgroundColor: '#2C2C2C',
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
    color: '#FFF',
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
    backgroundColor: '#2C2C2C',
    borderRadius: 24,
    marginBottom: 8,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 2,
    fontFamily: 'geistmono',
  },
  projectDate: {
    fontSize: 12,
    color: '#666',
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
    color: '#958989ff',
    fontFamily: 'geistmono',
  },
  optionsMenu: {
    position: 'absolute',
    top: 28,
    right: 4,
    backgroundColor: '#040404ff',
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
    borderTopColor: '#333',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'geistmono',
  },
});

