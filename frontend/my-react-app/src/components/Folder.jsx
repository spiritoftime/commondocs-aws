import React, { useState } from "react";
import { useAppContext } from "../context/appContext";
import Box from "@mui/material/Box";
import { useMutation } from "@tanstack/react-query";
import IconButton from "@mui/material/IconButton";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import PostAddIcon from "@mui/icons-material/PostAdd";
import FolderIcon from "@mui/icons-material/Folder";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Grid from "@mui/material/Grid";
import { createFolder, deleteFolder } from "../services/folder";
import { createDocument } from "../services/document";
import DeleteIcon from "@mui/icons-material/Delete";
import useReLoginMutation from "../customHooks/useReLoginMutation";

const Folder = ({
  node,
  type,
  depth,
  isOpen,
  onToggle,
  isPreview,
  handleOpen,
  accessType,
}) => {
  if (isPreview)
    return (
      <Grid
        item
        xs={12}
        display="flex"
        alignItems="center"
        paddingLeft={`${depth * 16}px`}
      >
        {isOpen ? (
          <ExpandMoreIcon
            sx={{ cursor: "pointer" }}
            onClick={() => onToggle(node.id)}
          />
        ) : (
          <KeyboardArrowRightIcon
            sx={{ cursor: "pointer" }}
            onClick={() => onToggle(node.id)}
          />
        )}
        <Typography
          display="flex"
          alignItems="center"
          variant="body1"
          gap={1}
          component="p"
        >
          <FolderIcon color="warning" />
          {node.text}
        </Typography>
        <Box display="flex" alignItems="center">
          <IconButton
            color="info"
            onClick={() => setShowInput({ visible: true, isFolder: true })}
          >
            <CreateNewFolderIcon />
          </IconButton>
          <IconButton
            color="success"
            onClick={() => setShowInput({ visible: true, isFolder: false })}
          >
            <PostAddIcon />
          </IconButton>
          <IconButton onClick={() => deleteFolderMutation(id)} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      </Grid>
    );
  const { tree, isDarkMode, authDetails, setAuthDetails, setIsLoadingAuth } =
    useAppContext();
  const reloginMutation = useReLoginMutation();
  const [openSnackBar, setOpenSnackBar] = useState(false);
  const [message, setMessage] = useState("");
  const [newNodeName, setNewNodeName] = useState("");
  const [showInput, setShowInput] = useState({
    visible: false,
    isFolder: null,
  });
  const { mutate: deleteFolderMutation } = useMutation({
    mutationFn: (folderId) => {
      return deleteFolder(folderId);
    },
    onSuccess: (res) => {
      reloginMutation();
    },
  });
  const {
    mutate: addFolderNodeMutation,
    error: addFolderNodeError,
    isError: IsaddFolderNodeError,
  } = useMutation({
    mutationFn: ({ title, folderId, createdBy, isFolder, accessType }) => {
      if (isFolder)
        return createFolder({ title, folderId, createdBy, accessType });
      return createDocument({ title, folderId, createdBy, accessType });
    },
    onSuccess: (res) => {
      reloginMutation(); // rerun login to get the updated tree
      setShowInput({ visible: false, isFolder: null });
      setNewNodeName("");
    },
  });

  const onAddFolderNode = (e) => {
    if (e.keyCode === 13 && e.target.value) {
      addFolderNodeMutation({
        title: e.target.value,
        folderId: node.id,
        createdBy: authDetails.id,
        accessType,
        isFolder: showInput.isFolder,
      });
    }
  };
  return (
    <Grid>
      {
        <Grid
          minHeight="40px"
          item
          xs={12}
          display="flex"
          alignItems="center"
          paddingLeft={`${depth * 16}px`}
        >
          {isOpen ? (
            <ExpandMoreIcon
              sx={{ cursor: "pointer" }}
              onClick={() => onToggle(node.id)}
            />
          ) : (
            <KeyboardArrowRightIcon
              sx={{ cursor: "pointer" }}
              onClick={() => onToggle(node.id)}
            />
          )}
          <Typography
            sx={{ cursor: "pointer", whiteSpace: "nowrap" }}
            display="flex"
            alignItems="center"
            gap={1}
            variant="body1"
            component="p"
          >
            <FolderIcon color="warning" />
            {node.text}
          </Typography>
          <Box display="flex" alignItems="center">
            {accessType !== "viewer" &&
              (node.id !== null || (node.id === null && type !== "shared")) && (
                <IconButton
                  color="info"
                  onClick={() => {
                    setShowInput({ visible: true, isFolder: true });
                    handleOpen(node.id);
                  }}
                >
                  <CreateNewFolderIcon />
                </IconButton>
              )}
            {node.id !== null && accessType !== "viewer" && (
              <IconButton
                color="success"
                onClick={() => {
                  setShowInput({ visible: true, isFolder: false });
                  handleOpen(node.id);
                }}
              >
                <PostAddIcon />
              </IconButton>
            )}
            {accessType !== "viewer" && node.id !== null && (
              <IconButton
                onClick={(e) => {
                  deleteFolderMutation(node.id);
                }}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Grid>
      }
      {showInput.visible && (
        <Grid item xs={12}>
          <input
            onChange={(e) => setNewNodeName(e.target.value)}
            style={{
              color: isDarkMode ? "white" : "#1f2b44",
              backgroundColor: isDarkMode ? "#fff" : "",
              background: "none",
              border: `1px solid ${isDarkMode ? "#d6b8b7" : "#1f2b44"}`,
            }}
            autoFocus
            onKeyDown={onAddFolderNode}
            onBlur={() => {
              setShowInput({ visible: false, isFolder: null });
              setNewNodeName("");
            }}
            className="node-input"
            placeholder={
              showInput.isFolder ? "Untitled Folder" : "Untitled Document"
            }
            value={newNodeName}
          ></input>
        </Grid>
      )}
    </Grid>
  );
};

export default Folder;
