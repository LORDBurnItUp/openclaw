"""IDE integration layer."""

from voxcode.ide.manager import IDEManager, get_ide_manager
from voxcode.ide.vscode import VSCodeAdapter
from voxcode.ide.system import SystemAdapter

__all__ = ["IDEManager", "get_ide_manager", "VSCodeAdapter", "SystemAdapter"]
